/*
 * PeerLedger demo data — entirely fictional.
 * Invented platform, invented users, invented orders.
 */

window.PEERLEDGER_STATE = { agent: "a.moreira", shift: "09:00-18:00", target: 80 };

window.PEERLEDGER_CLAIMS = [
  {
    id: "PL-204871",
    assigned: true,
    state: "Open",
    openedAt: "2026-08-26 09:12",
    ageMin: 214,
    slaHours: 6,
    priority: "Normal",
    type: "payment_not_received",
    typeLabel: "Payment not received",
    filedBy: "seller",
    order: {
      ref: "ORD-88213445", pair: "USDT/BRL", side: "Taker sell", asset: "USDT",
      cryptoAmount: "1,250.00", fiat: "BRL", fiatAmount: "7,312.50", price: "5.85",
      method: "Instant bank transfer", status: "Completed",
      createdAt: "2026-08-25 21:40", releasedAt: "2026-08-25 22:31"
    },
    parties: {
      seller: { handle: "marina_tr", uid: "40218877", tenure: "3y 2m", orders: 1841, disputes: 4, tier: "Merchant", country: "BR" },
      buyer: { handle: "novo_user_9931", uid: "91330042", tenure: "6d", orders: 3, disputes: 2, tier: "Individual", country: "BR" }
    },
    narrative:
      "I released the crypto because the buyer sent me a payment receipt in the chat and kept pressuring me saying the bank was slow. I checked my account this morning and nothing ever arrived. The receipt looks edited to me. I want the funds recovered.",
    evidence: [
      { label: "bank_statement_26aug.pdf", kind: "document", tag: "Transaction status" },
      { label: "account_balance.png", kind: "image", tag: "Amount mismatch" },
      { label: "receipt_from_buyer.png", kind: "image", tag: "Irrelevant" }
    ],
    chat: [
      { from: "buyer", at: "21:41", text: "hi, paying now" },
      { from: "seller", at: "21:44", text: "ok, send the receipt when done please" },
      { from: "buyer", at: "22:02", text: "done, here is the receipt [attachment]" },
      { from: "buyer", at: "22:09", text: "please release, my bank always takes a while to show but the money left already" },
      { from: "seller", at: "22:15", text: "i dont see anything in my account yet" },
      { from: "buyer", at: "22:18", text: "its a holiday delay. i have 400 orders, im not a scammer" },
      { from: "buyer", at: "22:27", text: "release it or i open a dispute against you" },
      { from: "seller", at: "22:31", text: "ok released, but if it doesnt arrive i will appeal" },
      { from: "buyer", at: "22:32", text: "thanks" }
    ],
    notes: [{ by: "queue.bot", at: "2026-08-26 09:12", text: "Claim created from complainant submission." }]
  },
  {
    id: "PL-204902",
    assigned: true,
    state: "Open",
    openedAt: "2026-08-26 10:03",
    ageMin: 163,
    slaHours: 6,
    priority: "High",
    type: "order_cancelled_after_payment",
    typeLabel: "Order cancelled after payment",
    filedBy: "buyer",
    order: {
      ref: "ORD-88219087", pair: "USDT/BRL", side: "Maker buy", asset: "USDT",
      cryptoAmount: "410.00", fiat: "BRL", fiatAmount: "2,398.50", price: "5.85",
      method: "Instant bank transfer", status: "Cancelled",
      createdAt: "2026-08-26 08:22", releasedAt: null
    },
    parties: {
      seller: { handle: "cambio_rapido", uid: "55901233", tenure: "1y 4m", orders: 622, disputes: 11, tier: "Merchant", country: "BR" },
      buyer: { handle: "t.oliveira", uid: "70118844", tenure: "2y 7m", orders: 190, disputes: 0, tier: "Individual", country: "BR" }
    },
    narrative:
      "I paid within the window and marked the order as paid. The seller cancelled the order anyway and now says he never got anything. The transfer left my account and I have the confirmation from my bank. I just want my money back.",
    evidence: [
      { label: "transfer_confirmation.pdf", kind: "document", tag: "Transaction status" },
      { label: "bank_app_receipt.png", kind: "image", tag: "Transaction status" }
    ],
    chat: [
      { from: "buyer", at: "08:24", text: "payment sent, receipt attached [attachment]" },
      { from: "seller", at: "08:41", text: "nothing here" },
      { from: "seller", at: "08:44", text: "send me your whatsapp number, easier to sort this out there" },
      { from: "buyer", at: "08:46", text: "i prefer to keep it in the platform chat" },
      { from: "seller", at: "08:52", text: "then i will cancel and you re-send to my other account" },
      { from: "buyer", at: "08:55", text: "please dont cancel, i already paid" },
      { from: "seller", at: "09:01", text: "cancelled. send to the other account and ill release" }
    ],
    notes: [
      { by: "queue.bot", at: "2026-08-26 10:03", text: "Claim created from complainant submission." },
      { by: "r.tavares", at: "2026-08-26 10:40", text: "Reassigned - original owner off shift." }
    ]
  },
  {
    id: "PL-204955",
    assigned: true,
    state: "Open",
    openedAt: "2026-08-26 11:47",
    ageMin: 99,
    slaHours: 12,
    priority: "High",
    type: "chargeback_after_release",
    typeLabel: "Chargeback after release",
    filedBy: "seller",
    order: {
      ref: "ORD-88104221", pair: "USDT/BRL", side: "Maker sell", asset: "USDT",
      cryptoAmount: "3,000.00", fiat: "BRL", fiatAmount: "17,550.00", price: "5.85",
      method: "Bank transfer", status: "Completed",
      createdAt: "2026-08-13 14:05", releasedAt: "2026-08-13 14:39"
    },
    parties: {
      seller: { handle: "lf_exchange", uid: "31200988", tenure: "4y 1m", orders: 5203, disputes: 9, tier: "Merchant", country: "BR" },
      buyer: { handle: "r_menezes88", uid: "88400271", tenure: "11m", orders: 47, disputes: 3, tier: "Individual", country: "BR" }
    },
    narrative:
      "The order completed normally almost two weeks ago and the money arrived. Yesterday my bank reversed the credit saying the sender disputed the transfer as fraud. The buyer is not answering. I have the original credit and the reversal notice from the bank.",
    evidence: [
      { label: "original_credit_13aug.pdf", kind: "document", tag: "Transaction status" },
      { label: "reversal_notice_25aug.pdf", kind: "document", tag: "Transaction status" },
      { label: "dispute_reference.png", kind: "image", tag: "Transaction status" }
    ],
    chat: [
      { from: "buyer", at: "14:07", text: "sending payment" },
      { from: "buyer", at: "14:20", text: "sent, please confirm" },
      { from: "seller", at: "14:38", text: "received, releasing now" },
      { from: "seller", at: "14:39", text: "released, thanks for trading" },
      { from: "buyer", at: "14:40", text: "thanks" }
    ],
    notes: [{ by: "queue.bot", at: "2026-08-26 11:47", text: "Claim created from complainant submission." }]
  },
  {
    id: "PL-205013",
    assigned: false,
    state: "Open",
    openedAt: "2026-08-26 13:20",
    ageMin: 46,
    slaHours: 6,
    priority: "Normal",
    type: "payment_not_received",
    typeLabel: "Payment not received",
    filedBy: "seller",
    order: {
      ref: "ORD-88231776", pair: "USDT/BRL", side: "Taker sell", asset: "USDT",
      cryptoAmount: "780.00", fiat: "BRL", fiatAmount: "4,563.00", price: "5.85",
      method: "Instant bank transfer", status: "Completed",
      createdAt: "2026-08-26 12:10", releasedAt: "2026-08-26 12:48"
    },
    parties: {
      seller: { handle: "ana.pmoraes", uid: "60771145", tenure: "8m", orders: 96, disputes: 1, tier: "Individual", country: "BR" },
      buyer: { handle: "jrsilva_p2p", uid: "42099310", tenure: "1y 9m", orders: 731, disputes: 5, tier: "Merchant", country: "BR" }
    },
    narrative:
      "Payment came from a completely different name than the buyer account. My bank flagged it and I had already released. I was told third party payments are not allowed. Please review.",
    evidence: [
      { label: "credit_sender_name.png", kind: "image", tag: "Amount mismatch" },
      { label: "order_summary.png", kind: "image", tag: "Irrelevant" }
    ],
    chat: [
      { from: "seller", at: "12:12", text: "hi, waiting for your payment" },
      { from: "buyer", at: "12:30", text: "my account is blocked today so my cousin is paying for me, is that ok?" },
      { from: "seller", at: "12:33", text: "i think it has to be same name" },
      { from: "buyer", at: "12:35", text: "its fine, everyone does it. paying now" },
      { from: "buyer", at: "12:44", text: "paid, receipt attached [attachment]" },
      { from: "seller", at: "12:48", text: "released" }
    ],
    notes: []
  },
  {
    id: "PL-205077",
    assigned: false,
    state: "Open",
    openedAt: "2026-08-26 14:55",
    ageMin: 31,
    slaHours: 12,
    priority: "Normal",
    type: "order_cancelled_after_payment",
    typeLabel: "Order cancelled after payment",
    filedBy: "buyer",
    order: {
      ref: "ORD-88240119", pair: "USDT/BRL", side: "Taker buy", asset: "USDT",
      cryptoAmount: "150.00", fiat: "BRL", fiatAmount: "877.50", price: "5.85",
      method: "Instant bank transfer", status: "Cancelled",
      createdAt: "2026-08-26 14:02", releasedAt: null
    },
    parties: {
      seller: { handle: "btc_maria", uid: "77302219", tenure: "2y 0m", orders: 388, disputes: 2, tier: "Merchant", country: "BR" },
      buyer: { handle: "d_costa_01", uid: "50914773", tenure: "4m", orders: 22, disputes: 1, tier: "Individual", country: "BR" }
    },
    narrative:
      "I paid 3 minutes after the timer expired because my bank app was down. The order auto cancelled. The seller says she will not return the money and stopped replying.",
    evidence: [{ label: "payment_receipt_1405.png", kind: "image", tag: "Transaction status" }],
    chat: [
      { from: "buyer", at: "14:03", text: "starting the transfer" },
      { from: "buyer", at: "14:19", text: "bank app is down, give me a few minutes please" },
      { from: "buyer", at: "14:33", text: "paid now, receipt attached [attachment]" },
      { from: "seller", at: "14:36", text: "the order already cancelled, the price moved" },
      { from: "buyer", at: "14:38", text: "can you return it then?" },
      { from: "seller", at: "14:51", text: "send me your telegram, we do it outside the platform, faster" }
    ],
    notes: []
  },
  {
    id: "PL-205104",
    assigned: false,
    state: "Open",
    openedAt: "2026-08-26 16:31",
    ageMin: 12,
    slaHours: 6,
    priority: "High",
    type: "chargeback_after_release",
    typeLabel: "Chargeback after release",
    filedBy: "seller",
    order: {
      ref: "ORD-88198340", pair: "USDT/BRL", side: "Maker sell", asset: "USDT",
      cryptoAmount: "2,100.00", fiat: "BRL", fiatAmount: "12,285.00", price: "5.85",
      method: "Bank transfer", status: "Completed",
      createdAt: "2026-08-21 10:14", releasedAt: "2026-08-21 10:52"
    },
    parties: {
      seller: { handle: "p2p_horizonte", uid: "20553301", tenure: "3y 6m", orders: 2984, disputes: 7, tier: "Merchant", country: "BR" },
      buyer: { handle: "kauan.ferr", uid: "93007712", tenure: "2m", orders: 9, disputes: 4, tier: "Individual", country: "BR" }
    },
    narrative:
      "Buyer paid from an account that was later reported as compromised. The bank pulled the funds back five days after the trade closed. This is the third time this month with newly created accounts.",
    evidence: [
      { label: "reversal_letter.pdf", kind: "document", tag: "Transaction status" },
      { label: "statement_extract.pdf", kind: "document", tag: "Transaction status" }
    ],
    chat: [
      { from: "buyer", at: "10:16", text: "hello, transferring now" },
      { from: "buyer", at: "10:31", text: "sent" },
      { from: "seller", at: "10:50", text: "confirmed on my side" },
      { from: "seller", at: "10:52", text: "released, good trade" }
    ],
    notes: []
  },
  {
    id: "PL-205131",
    assigned: false,
    state: "Open",
    openedAt: "2026-08-26 16:44",
    ageMin: 7,
    slaHours: 6,
    priority: "Normal",
    type: "payment_not_received",
    typeLabel: "Payment not received",
    filedBy: "seller",
    order: {
      ref: "ORD-88251902", pair: "USDT/BRL", side: "Taker sell", asset: "USDT",
      cryptoAmount: "95.00", fiat: "BRL", fiatAmount: "555.75", price: "5.85",
      method: "Instant bank transfer", status: "Completed",
      createdAt: "2026-08-26 16:02", releasedAt: "2026-08-26 16:20"
    },
    parties: {
      seller: { handle: "vinicius_ops", uid: "61200847", tenure: "1y 1m", orders: 210, disputes: 0, tier: "Individual", country: "BR" },
      buyer: { handle: "gabi.santos", uid: "84410029", tenure: "3y 8m", orders: 1502, disputes: 1, tier: "Merchant", country: "BR" }
    },
    narrative:
      "Small order but the payment never landed. Buyer says it was sent, I have my statement showing no credit in that window.",
    evidence: [{ label: "statement_window.pdf", kind: "document", tag: "Transaction status" }],
    chat: [
      { from: "buyer", at: "16:05", text: "transferring" },
      { from: "buyer", at: "16:14", text: "sent it, check please" },
      { from: "seller", at: "16:19", text: "cant see it but its small, releasing" },
      { from: "seller", at: "16:20", text: "released" },
      { from: "seller", at: "16:38", text: "still nothing, opening appeal" }
    ],
    notes: []
  },

  {
    id: "PL-205160",
    assigned: true,
    openedAt: "2026-08-26 15:10",
    ageMin: 76,
    slaHours: 12,
    priority: "Normal",
    type: "overpayment",
    typeLabel: "Overpayment",
    filedBy: "buyer",
    order: {
      ref: "ORD-88244501", pair: "USDT/BRL", side: "Taker buy", asset: "USDT",
      cryptoAmount: "600.00", fiat: "BRL", fiatAmount: "3,510.00", price: "5.85",
      method: "Instant bank transfer", status: "Completed",
      createdAt: "2026-08-26 13:31", releasedAt: "2026-08-26 13:58"
    },
    parties: {
      seller: { handle: "mesa_cripto", uid: "18220034", tenure: "2y 9m", orders: 1120, disputes: 3, tier: "Merchant", country: "BR" },
      buyer: { handle: "leandro.mv", uid: "66301182", tenure: "1y 2m", orders: 84, disputes: 0, tier: "Individual", country: "BR" }
    },
    narrative:
      "Paguei duas vezes por engano, o aplicativo do banco travou e eu enviei o pagamento novamente. O vendedor recebeu o valor em dobro e não quer devolver a diferença.",
    evidence: [
      { label: "comprovante_1.pdf", kind: "document", tag: "Transaction status" },
      { label: "comprovante_2.pdf", kind: "document", tag: "Amount mismatch" }
    ],
    chat: [
      { from: "buyer", at: "13:35", text: "boa tarde, já fiz o pagamento" },
      { from: "buyer", at: "13:41", text: "desculpa, o banco travou e eu paguei de novo por engano" },
      { from: "buyer", at: "13:42", text: "você pode devolver a diferença por favor?" },
      { from: "seller", at: "13:55", text: "recebi apenas um pagamento" },
      { from: "buyer", at: "13:57", text: "tenho os dois comprovantes do meu banco" },
      { from: "seller", at: "13:58", text: "liberado, mas não vou devolver nada" }
    ],
    notes: []
  },
  {
    id: "PL-205188",
    assigned: true,
    openedAt: "2026-08-26 16:02",
    ageMin: 24,
    slaHours: 6,
    priority: "Normal",
    type: "underpayment",
    typeLabel: "Underpayment",
    filedBy: "seller",
    order: {
      ref: "ORD-88249003", pair: "USDT/BRL", side: "Maker sell", asset: "USDT",
      cryptoAmount: "340.00", fiat: "BRL", fiatAmount: "1,989.00", price: "5.85",
      method: "Instant bank transfer", status: "Completed",
      createdAt: "2026-08-26 15:20", releasedAt: "2026-08-26 15:44"
    },
    parties: {
      seller: { handle: "sofia_trades", uid: "29104477", tenure: "1y 7m", orders: 405, disputes: 1, tier: "Merchant", country: "BR" },
      buyer: { handle: "m.ramirez", uid: "73558820", tenure: "9m", orders: 61, disputes: 2, tier: "Individual", country: "AR" }
    },
    narrative:
      "The buyer transferred less than the order amount and I released before checking the exact value. There is a shortfall against the order total.",
    evidence: [{ label: "credit_detail.png", kind: "image", tag: "Amount mismatch" }],
    chat: [
      { from: "buyer", at: "15:24", text: "hola, ya envié el pago del pedido" },
      { from: "buyer", at: "15:33", text: "el banco me cobró una comisión, por favor libere igual" },
      { from: "seller", at: "15:40", text: "the amount looks short" },
      { from: "buyer", at: "15:42", text: "es solo la comisión del banco, no es mi dinero" },
      { from: "seller", at: "15:44", text: "released, but I will appeal the difference" }
    ],
    notes: []
  },
  {
    id: "PL-205199",
    assigned: false,
    openedAt: "2026-08-26 16:51",
    ageMin: 5,
    slaHours: 12,
    priority: "High",
    type: "account_frozen",
    typeLabel: "Account frozen",
    filedBy: "seller",
    order: {
      ref: "ORD-88253117", pair: "USDT/BRL", side: "Maker sell", asset: "USDT",
      cryptoAmount: "4,500.00", fiat: "BRL", fiatAmount: "26,325.00", price: "5.85",
      method: "Bank transfer", status: "Completed",
      createdAt: "2026-08-24 09:12", releasedAt: "2026-08-24 09:51"
    },
    parties: {
      seller: { handle: "atlas_p2p", uid: "10039922", tenure: "4y 8m", orders: 7412, disputes: 12, tier: "Merchant", country: "BR" },
      buyer: { handle: "n_barros", uid: "81220913", tenure: "3m", orders: 14, disputes: 5, tier: "Individual", country: "BR" }
    },
    narrative:
      "My bank account was frozen after receiving the payment for this order. The bank says the incoming funds were reported. I need documentation of the trade to present to the bank.",
    evidence: [
      { label: "freeze_notice.pdf", kind: "document", tag: "Transaction status" },
      { label: "account_status.png", kind: "image", tag: "Transaction status" }
    ],
    chat: [
      { from: "buyer", at: "09:15", text: "sending the transfer now" },
      { from: "buyer", at: "09:44", text: "sent, please confirm" },
      { from: "seller", at: "09:50", text: "received, releasing" },
      { from: "seller", at: "09:51", text: "released" }
    ],
    notes: []
  }

];
