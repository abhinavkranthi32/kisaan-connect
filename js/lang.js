/**
 * KISSAN CONNECT - BILINGUAL LOCALIZATION (TELUGU & ENGLISH)
 */

let currentLang = 'te'; // Default to Telugu as requested

const TRANSLATIONS = {
  te: {
    ticker_title: 'తెలంగాణ మార్కెట్ ధరలు (Live Mandi Rates)',
    tagline_gov: 'తెలంగాణ వ్యవసాయ మార్కెట్ వేదిక • SIH 26132',
    hero_title: 'కిసాన్ కనెక్ట్ (Kissan Connect)',
    hero_subtitle: 'రైతులే ధర నిర్ణయించే సురక్షిత డిజిటల్ మార్కెట్. దళారులు లేకుండా నేరుగా అమ్మకాలు, పోటీ బిడ్డింగ్, తక్షణ ఎస్క్రో చెల్లింపులు.',
    badge_farmer_empowered: 'రైతుకే పూర్తి అధికారం',
    role_farmer_title: 'నేను రైతును (Farmer)',
    role_farmer_desc: 'మీ పంటకు మీరే డిమాండ్ ఆధారంగా ధర నిర్ణయించండి. కొనుగోలుదారుల లైవ్ బిడ్డింగ్ పరిశీలించి, నచ్చిన వారికి మాత్రమే అమ్మండి.',
    feat_f1: '✓ పంట ఫోటోలు, గ్రేడింగ్‌తో నేరుగా లిస్టింగ్',
    feat_f2: '✓ లైవ్ బిడ్డింగ్ వార్ – మీరే బిడ్ ఆమోదించండి',
    feat_f3: '✓ ఎస్క్రో గ్యారెంటీ – నేరుగా మీ బ్యాంక్ ఖాతాలోకే డబ్బు',
    btn_enter_farmer: 'రైతు ఖాతాలోకి ప్రవేశించండి (OTP Login) →',

    badge_buyer: 'ధృవీకరించబడిన వ్యాపారులు',
    role_buyer_title: 'కొనుగోలుదారు (Buyer)',
    role_buyer_desc: 'తెలంగాణ రైతులు మరియు FPOల నుండి నేరుగా నాణ్యమైన ధాన్యం, మిర్చి, పత్తిని పారదర్శక బిడ్డింగ్ ద్వారా సేకరించండి.',
    feat_b1: '✓ రైతుల పొలాల నుండే నాణ్యమైన పంట సేకరణ',
    feat_b2: '✓ పారదర్శక డిజిటల్ బిడ్డింగ్ & డిమాండ్ కోట్',
    feat_b3: '✓ నాణ్యత ధృవీకరణ & డిజిటల్ ఇన్వాయిస్',
    btn_enter_buyer: 'కొనుగోలుదారు పోర్టల్ (Phase 2) →',

    badge_transporter: 'రవాణా నెట్‌వర్క్',
    role_logistics_title: 'రవాణాదారు (Logistics)',
    role_logistics_desc: 'గ్రామీణ ప్రాంతాల నుండి మార్కెట్లు మరియు వేర్‌హౌస్‌లకు రవాణా ట్రిప్పులను ఆమోదించండి. సరసమైన ధరలు, తక్షణ లోడింగ్ ఛార్జీలు.',
    feat_l1: '✓ ట్రాక్టర్, డీసీఎం, లారీ ట్రిప్ ఆర్డర్లు',
    feat_l2: '✓ OTP ఆధారిత లోడింగ్ & అన్‌లోడింగ్ వెరిఫికేషన్',
    feat_l3: '✓ తక్షణ రవాణా చార్జీల విడుదల',
    btn_enter_logistics: 'రవాణా పోర్టల్ (Phase 3) →',

    stat_mandis: '6+',
    stat_mandis_sub: 'తెలంగాణ ప్రముఖ మార్కెట్లు',
    stat_escrow: '100%',
    stat_escrow_sub: 'ఎస్క్రో చెల్లింపు రక్షణ',
    stat_commission: '₹0',
    stat_commission_sub: 'రైతులకు మధ్యవర్తి కమీషన్',

    nav_home: 'హోమ్ (డ్యాష్‌బోర్డ్)',
    badge_farmer_portal: 'రైతు పోర్టల్',
    wallet_escrow_label: 'ఎస్క్రో నిధులు:',
    btn_switch_role: 'పాత్ర మార్చండి (Switch Role)',
    btn_switch_role_text: 'పాత్ర మార్చండి (హోమ్‌కు వెళ్లు)',
    tab_bidding_arena: 'లైవ్ బిడ్డింగ్ వార్',
    tab_create_lot: 'కొత్త పంట లిస్ట్ చేయండి',
    tab_charts: 'మార్కెట్ చార్ట్‌లు & ట్రెండ్స్',
    tab_hold_vs_sell: 'అమ్మాలా? నిల్వ చేయాలా?',
    tab_orders_escrow: 'ఆర్డర్లు & ఎస్క్రో ట్రాకర్',
    tab_disputes: 'సమస్య పరిష్కారం',

    bidding_title: 'మీ పంటలపై లైవ్ కొనుగోలుదారుల పోటీ బిడ్డింగ్',
    bidding_desc: 'రైతుగా మీకే పూర్తి నిర్ణయాధికారం ఉంది. కేవలం ఎక్కువ ధర మాత్రమే కాకుండా, కొనుగోలుదారు రేటింగ్ మరియు సొంత వాహనం తెచ్చే సౌకర్యాన్ని బట్టి డీల్ ఎంచుకోండి.',
    btn_refresh_bids: 'రిఫ్రెష్ బిడ్‌లు',

    create_lot_title: 'పంట వివరాలు నమోదు చేయండి (Create Crop Lot)',
    create_lot_subtitle: 'మీరు వివరాలు నమోదు చేసిన వెంటనే తెలంగాణ మార్కెట్ డిమాండ్ ఆధారంగా సిఫారసు చేయబడిన సరైన ధర లెక్కిస్తాము.',
    lbl_crop_name: 'పంట పేరు (Crop Name) *',
    lbl_variety: 'రకం / వెరైటీ (Variety) *',
    lbl_quantity: 'మొత్తం పరిమాణం (క్వింటాళ్లలో / Quintals) *',
    lbl_grade: 'నాణ్యతా గ్రేడ్ (Quality Grade) *',
    lbl_location: 'పొలం ఉన్న ప్రదేశం (Mandal & District) *',
    lbl_storage_type: 'నిల్వ ఉన్న ప్రదేశం (Storage Location) *',
    lbl_crop_photos: 'పంట అసలు ఫోటోలు (Product Images) *',
    upload_prompt: 'పంట ఫోటోను ఎంచుకోండి లేదా కెమెరాతో తీయండి',
    upload_hint: 'స్పష్టమైన ఫోటోలు పెడితే కొనుగోలుదారులు ఎక్కువ ధరకు బిడ్ వేస్తారు',
    preview_selected: 'ఎంచుకున్న ఫోటో సిద్ధంగా ఉంది',
    smart_ask_title: 'మార్కెట్ డిమాండ్ ఆధారిత ధర సలహాదారు (Smart Ask Price)',
    suggested_ask_label: 'సిఫారసు చేయబడిన బేస్ ధర (Recommended Ask):',
    helper_reserve_price: 'ఈ ధర కంటే తక్కువగా ఏ కొనుగోలుదారు కూడా బిడ్ వేయలేరు. మీకే పూర్తి రక్షణ.',
    btn_publish_lot: 'పంటను బిడ్డింగ్ కోసం లైవ్ చేయండి (List for Live Bidding)',
    mandi_snapshot_title: 'తెలంగాణ ప్రముఖ మార్కెట్ల రేట్లు',
    farmer_safety_title: 'రైతు భద్రతా హామీలు',

    advisor_heading: 'ఇప్పుడే అమ్మాలా? లేక గోదాములో దాచి తర్వాత అమ్మాలా?',
    advisor_sub: 'తెలంగాణ స్టేట్ వేర్‌హౌసింగ్ కార్పొరేషన్ (TSWC) నిల్వ ఖర్చులు మరియు రాబోయే 15 రోజుల ధరల అంచనాను విశ్లేషించి మీకు లాభదాయకమైన సలహా అందిస్తుంది.',
    tswc_title: '📍 సమీపంలోని తెలంగాణ ప్రభుత్వ వేర్‌హౌస్‌లు & కోల్డ్ స్టోరేజ్‌లు',

    orders_title: 'ఎస్క్రో చెల్లింపుల ట్రాకర్ & లైవ్ ఆర్డర్లు',
    orders_desc: 'కొనుగోలుదారు డబ్బు డిపాజిట్ చేయడం మొదలుకొని, మీ పొలం వద్ద OTP వెరిఫికేషన్ ద్వారా డబ్బు మీ బ్యాంక్ ఖాతాలో చేరేవరకు ప్రతి అడుగు పారదర్శకం.',

    dispute_title: 'రైతు సమస్య పరిష్కార వేదిక (Grievance Support)',
    dispute_subtitle: 'కొనుగోలుదారు బరువులో తేడా చూపించినా, లారీ రాక ఆలస్యమైనా, లేదా చెల్లింపులో సమస్య ఉన్నా వెంటనే ఫిర్యాదు నమోదు చేయండి. పరిష్కారం అయ్యేవరకు ఎస్క్రో డబ్బు భద్రంగా నిలిపివేయబడుతుంది.',
    lbl_dispute_order: 'ఆర్డర్ / డీల్ ఐడీ (Select Order) *',
    lbl_dispute_category: 'సమస్య రకం (Category) *',
    lbl_dispute_desc: 'సమస్య పూర్తి వివరాలు (Detailed Description) *',
    btn_submit_dispute: 'ఫిర్యాదు సమర్పించండి (Raise Dispute Ticket)',
    helpline_title: 'తెలంగాణ రైతు సహాయవాణి',

    auth_phone_title: 'రైతు మొబైల్ లాగిన్',
    auth_phone_sub: 'మీ 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి. తక్షణమే OTP పంపబడుతుంది.',
    btn_send_otp: 'OTP పంపండి (Get OTP) →',
    auth_otp_title: 'OTP వెరిఫికేషన్',
    otp_sent_to: 'ఈ నంబర్‌కు 6 అంకెల OTP పంపబడింది:',
    btn_verify_enter: 'వెరిఫై చేసి లోపలికి ప్రవేశించండి →',

    counter_title: 'కొనుగోలుదారుకు ఎదురు ప్రతిపాదన (Counter Offer)'
  },
  en: {
    ticker_title: 'Telangana Live Mandi Rates',
    tagline_gov: 'Telangana Agri Market Linkage Platform • SIH 26132',
    hero_title: 'Kissan Connect',
    hero_subtitle: 'A farmer-first digital agri marketplace. Direct selling without middlemen, live competitive buyer bidding, and 100% secured escrow payouts.',
    badge_farmer_empowered: 'Farmer in Full Control',
    role_farmer_title: 'I am a Farmer (రైతు)',
    role_farmer_desc: 'Quote your price based on real-time market demand. Watch verified buyers outbid each other and pick your best offer.',
    feat_f1: '✓ Direct listing with crop photos & quality specs',
    feat_f2: '✓ Live competitive bidding war – you decide who wins',
    feat_f3: '✓ Escrow guarantee – money goes directly to your bank',
    btn_enter_farmer: 'Enter Farmer Portal (OTP Login) →',

    badge_buyer: 'Verified Commercial Buyers',
    role_buyer_title: 'Commercial Buyer',
    role_buyer_desc: 'Procure high-quality grain, chilli, and cotton directly from Telangana farmers & FPOs through transparent bidding.',
    feat_b1: '✓ Direct farm-gate procurement',
    feat_b2: '✓ Transparent digital bidding & RFQs',
    feat_b3: '✓ Standardized quality grading & digital invoicing',
    btn_enter_buyer: 'Buyer Portal (Phase 2) →',

    badge_transporter: 'Rural Logistics Fleet',
    role_logistics_title: 'Transporter',
    role_logistics_desc: 'Accept produce haulage trips from rural villages to mandis and warehouses with upfront rates and guaranteed loading payments.',
    feat_l1: '✓ Tractor, DCM & Truck trip orders',
    feat_l2: '✓ OTP-based loading & unloading verification',
    feat_l3: '✓ Instant freight payout release',
    btn_enter_logistics: 'Logistics Portal (Phase 3) →',

    stat_mandis: '6+',
    stat_mandis_sub: 'Major Telangana Mandis',
    stat_escrow: '100%',
    stat_escrow_sub: 'Escrow Payment Protection',
    stat_commission: '₹0',
    stat_commission_sub: 'Middlemen Commission for Farmers',

    nav_home: 'Home (Dashboard)',
    badge_farmer_portal: 'Farmer Portal',
    wallet_escrow_label: 'Escrow Funds:',
    btn_switch_role: 'Switch Role',
    btn_switch_role_text: 'Switch Role (Back to Home)',
    tab_bidding_arena: 'Live Bidding War',
    tab_create_lot: 'List New Crop Lot',
    tab_charts: 'Market Charts & Trends',
    tab_hold_vs_sell: 'Hold or Sell? (AI Advisor)',
    tab_orders_escrow: 'Orders & Escrow Tracker',
    tab_disputes: 'Dispute Redressal',

    bidding_title: 'Live Buyer Bidding War on Your Harvest',
    bidding_desc: 'As a farmer, you hold all bargaining power. Select the winner based on highest price, buyer credibility rating, and whether they arrange pickup vehicles.',
    btn_refresh_bids: 'Refresh Bids',

    create_lot_title: 'List Your Crop Lot for Bidding',
    create_lot_subtitle: 'Enter your crop details to receive a real-time demand-driven Smart Ask price recommendation.',
    lbl_crop_name: 'Crop Name *',
    lbl_variety: 'Crop Variety *',
    lbl_quantity: 'Total Quantity (in Quintals) *',
    lbl_grade: 'Quality Grade *',
    lbl_location: 'Farm Location (Mandal & District) *',
    lbl_storage_type: 'Storage Location *',
    lbl_crop_photos: 'Product Images *',
    upload_prompt: 'Select crop photo or take a picture',
    upload_hint: 'Clear harvest photos attract 12-18% higher buyer bids',
    preview_selected: 'Selected photo ready',
    smart_ask_title: 'Market Demand-Based Smart Ask Engine',
    suggested_ask_label: 'Recommended Ask Range:',
    helper_reserve_price: 'Buyers cannot bid below this price. You are 100% protected.',
    btn_publish_lot: 'Publish Harvest to Live Bidding Arena',
    mandi_snapshot_title: 'Key Telangana Mandi Rates',
    farmer_safety_title: 'Farmer Safety Guarantees',

    advisor_heading: 'Should You Sell Now or Hold in Warehouse?',
    advisor_sub: 'Analyzes 15-day price projections vs. Telangana State Warehousing Corporation (TSWC) cold storage costs to give you maximum net realization.',
    tswc_title: '📍 Nearby Telangana State Warehouses (TSWC)',

    orders_title: 'Escrow Payout Tracker & Active Orders',
    orders_desc: 'From buyer escrow funding to farm-gate OTP verification, every milestone is transparently tracked until money is credited into your account.',

    dispute_title: 'Farmer Grievance & Dispute Redressal',
    dispute_subtitle: 'Report weight scale discrepancies, vehicle delays, or unfair grading. Escrow funds remain safely frozen until resolution.',
    lbl_dispute_order: 'Select Order ID *',
    lbl_dispute_category: 'Dispute Category *',
    lbl_dispute_desc: 'Detailed Description of Issue *',
    btn_submit_dispute: 'Raise Dispute Ticket',
    helpline_title: 'Telangana Farmer Support Line',

    auth_phone_title: 'Farmer Mobile Login',
    auth_phone_sub: 'Enter your 10-digit mobile number. An instant verification OTP will be sent.',
    btn_send_otp: 'Send Verification OTP →',
    auth_otp_title: 'Enter 6-Digit OTP',
    otp_sent_to: 'Verification code sent to:',
    btn_verify_enter: 'Verify & Enter Dashboard →',

    counter_title: 'Counter Offer to Buyer'
  }
};

function setLanguage(lang) {
  if (lang !== 'te' && lang !== 'en') return;
  currentLang = lang;

  // Update body class for font preference
  if (lang === 'en') {
    document.body.classList.add('lang-en');
    document.getElementById('btnLangEn').classList.add('active');
    document.getElementById('btnLangTe').classList.remove('active');
  } else {
    document.body.classList.remove('lang-en');
    document.getElementById('btnLangTe').classList.add('active');
    document.getElementById('btnLangEn').classList.remove('active');
  }

  // Update all DOM elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      el.textContent = TRANSLATIONS[lang][key];
    }
  });

  // Update breadcrumbs and active tab name
  if (typeof updateTabBreadcrumb === 'function') updateTabBreadcrumb();

  // Re-render dynamic components with localized text
  if (typeof renderMandiTicker === 'function') renderMandiTicker();
  if (typeof renderBiddingArena === 'function') renderBiddingArena();
  if (typeof updateHoldSellAdvice === 'function') updateHoldSellAdvice();
  if (typeof renderOrdersEscrow === 'function') renderOrdersEscrow();
  if (typeof renderMandiSnapshot === 'function') renderMandiSnapshot();
  if (typeof updateMarketCharts === 'function') updateMarketCharts();
  if (typeof calculateDemandAsk === 'function') calculateDemandAsk();
}
