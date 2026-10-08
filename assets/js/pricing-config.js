/**
 * ==============================================================================
 * AGOLA POLYMER - PRODUCT & RESIN RATES CONFIGURATION FILE
 * ==============================================================================
 * 
 * ભાવ બદલવા માટેની સરળ સૂચના (How to Change Rates):
 * 1. ગમે ત્યારે પ્રોડક્ટ કે કાચા માલ (Resin) ના ભાવ બદલવા હોય, ત્યારે માત્ર આ ફાઈલમાં
 *    નીચે આપેલા ભાવ (Numbers) બદલીને ફાઈલ Save કરી દો.
 * 2. વેબસાઈટ પર Table, Ticker, Calculator અને WhatsApp Message માં આપોઆપ નવા ભાવો
 *    અને Live Dollar ($) / Euro (€) ના ભાવો કેલ્ક્યુલેટ થઈ જશે.
 * ==============================================================================
 */

window.AGOLA_PRICING_CONFIG = {
  // ૧. ફિનિશ્ડ પ્રોડક્ટ્સના ભાવો (INR ₹ / Kg - 100% Virgin Prime)
  products: [
    {
      id: 1,
      name: "LD LINER ROLL",
      price: 153,
      specs: "Continuous tubular roll • 20μ to 250μ • 100% Virgin Prime"
    },
    {
      id: 2,
      name: "INDUSTRIAL LINER BAG",
      price: 158,
      specs: "Heavy duty drum & carton liners • Side/Bottom gusseted • Puncture proof"
    },
    {
      id: 3,
      name: "CUSTOM LINER BAG",
      price: 158,
      specs: "Engineered dimensions & micron • 20μ to 250μ • Bespoke packaging"
    },
    {
      id: 4,
      name: "LD SHRINK FILM",
      price: 185,
      specs: "Biaxial thermal shrink rolls • Bottle & tile bundling • High tensile strength"
    },
    {
      id: 5,
      name: "STRETCH FILM",
      price: 175,
      specs: "High-dart pallet wrapping film • Manual & machine roll • 300% Pre-stretch"
    },
    {
      id: 6,
      name: "CUSTOM PRINTED LD BAG",
      price: 158,
      specs: "Up to 8 colour flexo printing • Brand logo & statutory warning • Virgin LDPE"
    }
  ],

  // ૨. પોલીમર રો-મટિરિયલ બેન્ચમાર્ક ભાવો (INR ₹ / Kg - Ex-works Gujarat Basis)
  // LLDPE Benchmark Source: https://credcosourcing.com/prices/ll/jf19010-ll-slip-ril-mfi-1-by-ril-323
  // LDPE Benchmark Source: https://credcosourcing.com/prices/ld/2427k-ld-gp-slip-basell-mfi-4-by-lyondellbasell-190
  resinBenchmarks: {
    lldpe: 140.00,        // LLDPE Film Grade (Virgin JF19010 MFI 1)
    ldpe: 172.00,         // LDPE Heavy Duty Extrusion (2427K / 24FS040 MFI 4)
    mlldpe: 116.00,       // Metallocene mLLDPE Resin (High Dart)
    stretchResin: 102.80  // Cast Stretch Grade LLDPE (300% Cast)
  },

  // ૩. ડિફોલ્ટ ઇન્ટરનેશનલ ફોરેક્સ સંદર્ભ દર (Forex API ઓફલાઇન હોય ત્યારે)
  defaultForex: {
    USD: 86.85,  // 1 USD = 86.85 INR
    EUR: 94.40,  // 1 EUR = 94.40 INR
    GBP: 109.80, // 1 GBP = 109.80 INR
    AED: 23.65   // 1 AED = 23.65 INR
  }
};
