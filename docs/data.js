/*
 * PeerLedger demo data — entirely fictional.
 * Names, handles, order IDs, amounts and transcripts are invented for this demo.
 */
window.PEERLEDGER_CLAIMS = [
  {
    id: "PL-204871",
    openedAt: "2026-08-24 09:12",
    slaHours: 6,
    type: "payment_not_received",
    typeLabel: "Payment not received",
    filedBy: "seller",
    order: {
      ref: "ORD-88213445",
      asset: "USDT",
      cryptoAmount: "1,250.00",
      fiat: "BRL",
      fiatAmount: "7,312.50",
      price: "5.85",
      method: "Instant bank transfer",
      status: "Released",
      createdAt: "2026-08-23 21:40",
      releasedAt: "2026-08-23 22:31"
    },
    parties: {
      seller: { handle: "marina_tr", tenure: "3y 2m", orders: 1841, disputes: 4 },
      buyer: { handle: "novo_user_9931", tenure: "6d", orders: 3, disputes: 2 }
    },
    narrative:
      "I released the crypto because the buyer sent me a payment receipt in the chat and kept pressuring me saying the bank was slow. I checked my account this morning and nothing ever arrived. The receipt looks edited to me. I want the funds recovered.",
    evidence: [
      { label: "bank_statement_24aug.pdf", kind: "document" },
      { label: "account_balance_screenshot.png", kind: "image" },
      { label: "receipt_sent_by_buyer.png", kind: "image" }
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
    ]
  },
  {
    id: "PL-204902",
    openedAt: "2026-08-24 10:03",
    slaHours: 6,
    type: "order_cancelled_after_payment",
    typeLabel: "Order cancelled after payment",
    filedBy: "buyer",
    order: {
      ref: "ORD-88219087",
      asset: "USDT",
      cryptoAmount: "410.00",
      fiat: "BRL",
      fiatAmount: "2,398.50",
      price: "5.85",
      method: "Instant bank transfer",
      status: "Cancelled",
      createdAt: "2026-08-24 08:22",
      releasedAt: null
    },
    parties: {
      seller: { handle: "cambio_rapido", tenure: "1y 4m", orders: 622, disputes: 11 },
      buyer: { handle: "t.oliveira", tenure: "2y 7m", orders: 190, disputes: 0 }
    },
    narrative:
      "I paid within the window and marked the order as paid. The seller cancelled the order anyway and now says he never got anything. The transfer left my account and I have the confirmation from my bank. I just want my money back.",
    evidence: [
      { label: "transfer_confirmation.pdf", kind: "document" },
      { label: "bank_app_receipt.png", kind: "image" }
    ],
    chat: [
      { from: "buyer", at: "08:24", text: "payment sent, receipt attached [attachment]" },
      { from: "seller", at: "08:41", text: "nothing here" },
      { from: "seller", at: "08:44", text: "send me your whatsapp number, easier to sort this out there" },
      { from: "buyer", at: "08:46", text: "i prefer to keep it in the platform chat" },
      { from: "seller", at: "08:52", text: "then i will cancel and you re-send to my other account" },
      { from: "buyer", at: "08:55", text: "please dont cancel, i already paid" },
      { from: "seller", at: "09:01", text: "cancelled. send to the other account and ill release" }
    ]
  },
  {
    id: "PL-204955",
    openedAt: "2026-08-24 11:47",
    slaHours: 12,
    type: "chargeback_after_release",
    typeLabel: "Chargeback after release",
    filedBy: "seller",
    order: {
      ref: "ORD-88104221",
      asset: "USDT",
      cryptoAmount: "3,000.00",
      fiat: "BRL",
      fiatAmount: "17,550.00",
      price: "5.85",
      method: "Bank transfer",
      status: "Released",
      createdAt: "2026-08-11 14:05",
      releasedAt: "2026-08-11 14:39"
    },
    parties: {
      seller: { handle: "lf_exchange", tenure: "4y 1m", orders: 5203, disputes: 9 },
      buyer: { handle: "r_menezes88", tenure: "11m", orders: 47, disputes: 3 }
    },
    narrative:
      "The order completed normally almost two weeks ago and the money arrived. Yesterday my bank reversed the credit saying the sender disputed the transfer as fraud. The buyer is not answering. I have the original credit and the reversal notice from the bank.",
    evidence: [
      { label: "original_credit_11aug.pdf", kind: "document" },
      { label: "reversal_notice_23aug.pdf", kind: "document" },
      { label: "bank_dispute_reference.png", kind: "image" }
    ],
    chat: [
      { from: "buyer", at: "14:07", text: "sending payment" },
      { from: "buyer", at: "14:20", text: "sent, please confirm" },
      { from: "seller", at: "14:38", text: "received, releasing now" },
      { from: "seller", at: "14:39", text: "released, thanks for trading" },
      { from: "buyer", at: "14:40", text: "thanks" }
    ]
  },
  {
    id: "PL-205013",
    openedAt: "2026-08-24 13:20",
    slaHours: 6,
    type: "payment_not_received",
    typeLabel: "Payment not received",
    filedBy: "seller",
    order: {
      ref: "ORD-88231776",
      asset: "USDT",
      cryptoAmount: "780.00",
      fiat: "BRL",
      fiatAmount: "4,563.00",
      price: "5.85",
      method: "Instant bank transfer",
      status: "Released",
      createdAt: "2026-08-24 12:10",
      releasedAt: "2026-08-24 12:48"
    },
    parties: {
      seller: { handle: "ana.pmoraes", tenure: "8m", orders: 96, disputes: 1 },
      buyer: { handle: "jrsilva_p2p", tenure: "1y 9m", orders: 731, disputes: 5 }
    },
    narrative:
      "Payment came from a completely different name than the buyer account. My bank flagged it and I had already released. I was told third party payments are not allowed. Please review.",
    evidence: [
      { label: "credit_detail_sender_name.png", kind: "image" },
      { label: "order_summary.png", kind: "image" }
    ],
    chat: [
      { from: "seller", at: "12:12", text: "hi, waiting for your payment" },
      { from: "buyer", at: "12:30", text: "my account is blocked today so my cousin is paying for me, is that ok?" },
      { from: "seller", at: "12:33", text: "i think it has to be same name" },
      { from: "buyer", at: "12:35", text: "its fine, everyone does it. paying now" },
      { from: "buyer", at: "12:44", text: "paid, receipt attached [attachment]" },
      { from: "seller", at: "12:48", text: "released" }
    ]
  },
  {
    id: "PL-205077",
    openedAt: "2026-08-24 14:55",
    slaHours: 12,
    type: "order_cancelled_after_payment",
    typeLabel: "Order cancelled after payment",
    filedBy: "buyer",
    order: {
      ref: "ORD-88240119",
      asset: "USDT",
      cryptoAmount: "150.00",
      fiat: "BRL",
      fiatAmount: "877.50",
      price: "5.85",
      method: "Instant bank transfer",
      status: "Cancelled",
      createdAt: "2026-08-24 14:02",
      releasedAt: null
    },
    parties: {
      seller: { handle: "btc_maria", tenure: "2y 0m", orders: 388, disputes: 2 },
      buyer: { handle: "d_costa_01", tenure: "4m", orders: 22, disputes: 1 }
    },
    narrative:
      "I paid 3 minutes after the timer expired because my bank app was down. The order auto cancelled. The seller says she will not return the money and stopped replying.",
    evidence: [{ label: "payment_receipt_1405.png", kind: "image" }],
    chat: [
      { from: "buyer", at: "14:03", text: "starting the transfer" },
      { from: "buyer", at: "14:19", text: "bank app is down, give me a few minutes please" },
      { from: "buyer", at: "14:33", text: "paid now, receipt attached [attachment]" },
      { from: "seller", at: "14:36", text: "the order already cancelled, the price moved" },
      { from: "buyer", at: "14:38", text: "can you return it then?" },
      { from: "seller", at: "14:51", text: "send me your telegram, we do it outside the platform, faster" }
    ]
  },
  {
    id: "PL-205104",
    openedAt: "2026-08-24 16:31",
    slaHours: 6,
    type: "chargeback_after_release",
    typeLabel: "Chargeback after release",
    filedBy: "seller",
    order: {
      ref: "ORD-88198340",
      asset: "USDT",
      cryptoAmount: "2,100.00",
      fiat: "BRL",
      fiatAmount: "12,285.00",
      price: "5.85",
      method: "Bank transfer",
      status: "Released",
      createdAt: "2026-08-19 10:14",
      releasedAt: "2026-08-19 10:52"
    },
    parties: {
      seller: { handle: "p2p_horizonte", tenure: "3y 6m", orders: 2984, disputes: 7 },
      buyer: { handle: "kauan.ferr", tenure: "2m", orders: 9, disputes: 4 }
    },
    narrative:
      "Buyer paid from an account that was later reported as compromised. The bank pulled the funds back five days after the trade closed. This is the third time this month with newly created accounts.",
    evidence: [
      { label: "reversal_letter.pdf", kind: "document" },
      { label: "statement_extract.pdf", kind: "document" }
    ],
    chat: [
      { from: "buyer", at: "10:16", text: "hello, transferring now" },
      { from: "buyer", at: "10:31", text: "sent" },
      { from: "seller", at: "10:50", text: "confirmed on my side" },
      { from: "seller", at: "10:52", text: "released, good trade" }
    ]
  }
];
