/**
 * Passerelle d'Impression Thermique ESC/POS (80 mm)
 * ----------------------------------------------------
 * Ce script permet d'envoyer directement les commandes vers une imprimante
 * thermique de caisse ou cuisine (Xprinter, Epson, Bixolon, Star)
 * connectée en réseau local (IP LAN / Wi-Fi sur port 9100) ou en USB.
 *
 * Utilisation :
 * node src/scripts/escpos-printer.js --ip 192.168.1.200
 */

const net = require('net');

// Commandes standards ESC/POS
const ESC = '\x1B';
const GS = '\x1D';

const COMMANDS = {
  INIT: ESC + '@',                       // Réinitialisation imprimante
  TEXT_NORMAL: ESC + '!' + '\x00',       // Police normale
  TEXT_BOLD: ESC + 'E' + '\x01',         // Texte en gras
  TEXT_BOLD_OFF: ESC + 'E' + '\x00',     // Désactiver gras
  TEXT_DOUBLE_HEIGHT: ESC + '!' + '\x10',// Double hauteur
  TEXT_DOUBLE_WIDTH: ESC + '!' + '\x20', // Double largeur
  TEXT_TITLE: ESC + '!' + '\x30',        // Grand titre (double h & w)
  ALIGN_LEFT: ESC + 'a' + '\x00',        // Alignement à gauche
  ALIGN_CENTER: ESC + 'a' + '\x01',      // Alignement centré
  ALIGN_RIGHT: ESC + 'a' + '\x02',       // Alignement à droite
  PAPER_FEED: '\n\n\n',                  // Avance papier
  PAPER_CUT: GS + 'V' + '\x41' + '\x03', // Découpe papier automatique
  BEEP: ESC + 'B' + '\x03' + '\x02',     // Alarme sonore de l'imprimante
  OPEN_DRAWER: ESC + 'p' + '\x00' + '\x32' + '\xfa', // Impulsion ouverture tiroir-caisse
};

/**
 * Génère le tampon binaire ESC/POS formaté pour 80 mm
 */
function buildEscPosTicket(order, type = 'kitchen') {
  let ticket = '';

  ticket += COMMANDS.INIT;
  ticket += COMMANDS.BEEP; // Alerte sonore de l'imprimante

  // En-tête
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.TEXT_TITLE + 'LE GOURMET EXPRESS\n' + COMMANDS.TEXT_NORMAL;
  ticket += '------------------------------------------\n';
  ticket += COMMANDS.TEXT_BOLD;
  ticket += `*** TICKET ${type === 'kitchen' ? 'CUISINE' : 'LIVREUR & CLIENT'} ***\n`;
  ticket += COMMANDS.TEXT_DOUBLE_HEIGHT;
  ticket += `COMMANDE : ${order.orderNumber}\n`;
  ticket += COMMANDS.TEXT_NORMAL + COMMANDS.TEXT_BOLD_OFF;
  const modeLabel = order.mode === 'dine_in' 
    ? `SUR PLACE (${order.tableNumber || 'TABLE'})` 
    : order.mode === 'delivery' 
    ? 'LIVRAISON' 
    : 'A EMPORTER';

  ticket += `Heure : ${order.createdAt} | Mode : ${modeLabel}\n`;
  ticket += '------------------------------------------\n';

  // Coordonnées client
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += `Client : ${order.customer.fullName}\n`;
  ticket += `Tel    : ${order.customer.phone}\n`;

  if (order.mode === 'dine_in') {
    ticket += `Table  : ${order.tableNumber || 'Service a table'}\n`;
    if (order.customer.specialInstructions) {
      ticket += `NOTE CUISINE : ${order.customer.specialInstructions}\n`;
    }
  } else if (order.mode === 'delivery') {
    ticket += `Adresse: ${order.customer.address}\n`;
    if (order.customer.landmark) {
      ticket += `Repere : ${order.customer.landmark}\n`;
    }
    if (order.customer.specialInstructions) {
      ticket += `NOTE   : ${order.customer.specialInstructions}\n`;
    }
  }
  ticket += '------------------------------------------\n';

  // Détail des plats
  ticket += COMMANDS.TEXT_BOLD;
  ticket += 'QTE  DESIGNATION                           PRIX\n';
  ticket += COMMANDS.TEXT_BOLD_OFF;
  ticket += '------------------------------------------\n';

  order.items.forEach((item) => {
    const qty = String(item.quantity).padEnd(4, ' ');
    const name = item.product.name.fr.substring(0, 28).padEnd(28, ' ');
    const price = `${item.totalPrice} DH`.padStart(8, ' ');
    ticket += `${qty} ${name} ${price}\n`;

    // Options et variantes
    if (item.selectedOptions && item.selectedOptions.length > 0) {
      item.selectedOptions.forEach((opt) => {
        ticket += `     + ${opt.optionName.fr}\n`;
      });
    }

    if (item.specialInstructions) {
      ticket += `     ** CONSIGNE: ${item.specialInstructions} **\n`;
    }
  });

  ticket += '------------------------------------------\n';

  // Montant (ticket livraison)
  if (type === 'delivery') {
    ticket += COMMANDS.ALIGN_RIGHT;
    ticket += `Sous-total : ${order.subtotal} DH\n`;
    ticket += `Livraison  : ${order.deliveryFee} DH\n`;
    ticket += COMMANDS.TEXT_TITLE;
    ticket += `TOTAL : ${order.total} DH\n`;
    ticket += COMMANDS.TEXT_NORMAL;
    ticket += `Paiement : ${order.customer.paymentMethod === 'cash' ? `Especes (${order.customer.cashChangeAmount || 'Appoint'})` : 'Carte Bancaire (TPE)'}\n`;
    ticket += '------------------------------------------\n';
  }

  // Pied de page
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += 'Merci pour votre confiance !\n';
  ticket += 'Le Gourmet Express - Bon Appetit\n';

  // Avance papier & découpe
  ticket += COMMANDS.PAPER_FEED;
  ticket += COMMANDS.PAPER_CUT;

  return Buffer.from(ticket, 'latin1');
}

/**
 * Envoie le ticket vers une imprimante thermique IP
 */
function sendToNetworkPrinter(ipAddress, port = 9100, buffer) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.setTimeout(5000);

    client.connect(port, ipAddress, () => {
      client.write(buffer, () => {
        client.destroy();
        resolve(true);
      });
    });

    client.on('error', (err) => {
      client.destroy();
      reject(err);
    });

    client.on('timeout', () => {
      client.destroy();
      reject(new Error("Timeout connexion imprimante"));
    });
  });
}

module.exports = {
  buildEscPosTicket,
  sendToNetworkPrinter,
  COMMANDS,
};
