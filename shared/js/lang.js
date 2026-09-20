/**
 * KISSAN CONNECT (కిసాన్ కనెక్ట్) - MASTER BILINGUAL LOCALIZATION ENGINE
 * 100% Pure Telugu (తెలుగు) & 100% Pure English across all 4 Portals.
 * Features persistent state in localStorage and synchronized BroadcastChannel across tabs.
 */

// 1. Initial State from localStorage (defaults to Telugu)
function getStoredLang() {
  try {
    const saved = localStorage.getItem('kissan_lang') || localStorage.getItem('kissan_preferred_language');
    if (saved === 'en' || saved === 'te') return saved;
  } catch (e) {}
  return 'te';
}

var currentLang = getStoredLang();
if (typeof window !== 'undefined') {
  window.currentLang = currentLang;
}

// 2. Broadcast Channel for Instant Cross-Tab Language Sync
let langChannel = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    langChannel = new BroadcastChannel('kissan_lang_sync');
    langChannel.onmessage = function (e) {
      if (e.data && e.data.lang && e.data.lang !== currentLang) {
        setLanguage(e.data.lang, false);
      }
    };
  }
} catch (e) {}

// Fallback storage listener for older browsers
if (typeof window !== 'undefined') {
  window.addEventListener('storage', function (e) {
    if ((e.key === 'kissan_lang' || e.key === 'kissan_preferred_language') && e.newValue) {
      if (e.newValue !== currentLang && (e.newValue === 'te' || e.newValue === 'en')) {
        setLanguage(e.newValue, false);
      }
    }
  });
}

// 3. MASTER COMPREHENSIVE TRANSLATIONS DICTIONARY
const TRANSLATIONS = {
  te: {
    // Portal Document Titles
    page_title_main: 'కిసాన్ కనెక్ట్ | తెలంగాణ వ్యవసాయ మార్కెట్ వేదిక',
    page_title_farmer: 'కిసాన్ కనెక్ట్ | రైతు పోర్టల్',
    page_title_buyer: 'కిసాన్ కనెక్ట్ | కొనుగోలుదారు పోర్టల్',
    page_title_logistics: 'కిసాన్ కనెక్ట్ | రవాణాదారు పోర్టల్',

    // Top Bar & Branding
    ticker_title: 'తెలంగాణ ప్రత్యక్ష మార్కెట్ ధరలు',
    tagline_gov: 'తెలంగాణ వ్యవసాయ మార్కెట్ వేదిక • SIH 26132',
    hero_title: 'కిసాన్ కనెక్ట్',
    hero_subtitle: 'రైతులే ధర నిర్ణయించే సురక్షిత డిజిటల్ మార్కెట్. దళారులు లేకుండా నేరుగా అమ్మకాలు, పోటీ బిడ్డింగ్, తక్షణ ఎస్క్రో చెల్లింపులు.',
    badge_farmer_portal: 'రైతు పోర్టల్',
    badge_buyer_portal: 'కొనుగోలుదారు పోర్టల్',
    badge_logistics_portal: 'రవాణాదారు పోర్టల్',
    nav_home: 'హోమ్',
    btn_switch_role: 'పాత్ర మార్చండి',
    btn_switch_role_text: 'పాత్ర మార్చండి (హోమ్‌కు వెళ్లు)',
    wallet_escrow_label: 'ఎస్క్రో నిధులు:',
    escrow_deposit_label: 'ఎస్క్రో డిపాజిట్:',
    total_earned_label: 'సంపాదించిన మొత్తం:',
    business_firm_label: 'వ్యాపార సంస్థ:',
    rythubandhu_badge: '✓ రైతుబంధు ధృవీకరించబడింది',
    verified_apmc_badge: '✓ APMC లైసెన్స్ ధృవీకరించబడింది',
    safe_100_badge: '100% సురక్షితం',

    // User Profile Names & Places
    farmer_profile_name: 'మల్లారెడ్డి',
    farmer_profile_village: '📍 జనగామ, వరంగల్ జిల్లా',
    buyer_firm_1: 'ITC అగ్రి బిజినెస్ హబ్ (సికింద్రాబాద్)',
    buyer_firm_2: 'శ్రీ కృష్ణ మోడ్రన్ రైస్ మిల్స్ (మిర్యాలగూడ)',
    buyer_firm_3: 'ఖమ్మం స్పైసెస్ ఎక్స్‌పోర్టర్స్ (ఖమ్మం)',

    // Role Chooser (Main Portal)
    badge_farmer_empowered: 'రైతుకే పూర్తి అధికారం',
    role_farmer_title: 'నేను రైతును',
    role_farmer_desc: 'మీ పంటకు మీరే డిమాండ్ ఆధారంగా ధర నిర్ణయించండి. కొనుగోలుదారుల లైవ్ బిడ్డింగ్ పరిశీలించి, నచ్చిన వారికి మాత్రమే అమ్మండి.',
    feat_f1: '✓ పంట ఫోటోలు, గ్రేడింగ్‌తో నేరుగా లిస్టింగ్',
    feat_f2: '✓ లైవ్ బిడ్డింగ్ వార్ – మీరే బిడ్ ఆమోదించండి',
    feat_f3: '✓ ఎస్క్రో గ్యారెంటీ – నేరుగా మీ బ్యాంక్ ఖాతాలోకే డబ్బు',
    btn_instant_login: '⚡ తక్షణ రైతు లాగిన్ →',
    btn_enter_farmer: '📱 మొబైల్ OTP లాగిన్',
    btn_demo_login: '⚡ డెమో లాగిన్ (OTP లేకుండా) →',
    btn_skip_otp: '⚡ నేరుగా ప్రవేశించండి (డెమో)',

    badge_buyer: 'ధృవీకరించబడిన వ్యాపారులు',
    role_buyer_title: 'కొనుగోలుదారు',
    role_buyer_desc: 'తెలంగాణ రైతులు మరియు FPOల నుండి నేరుగా నాణ్యమైన ధాన్యం, మిర్చి, పత్తిని పారదర్శక బిడ్డింగ్ ద్వారా సేకరించండి.',
    feat_b1: '✓ రైతుల పొలాల నుండే నాణ్యమైన పంట సేకరణ',
    feat_b2: '✓ పారదర్శక డిజిటల్ బిడ్డింగ్ & RFQ టెండర్లు',
    feat_b3: '✓ APMC సెస్ మినహాయింపు & డిజిటల్ ఇన్వాయిస్',
    btn_enter_buyer: 'కొనుగోలుదారు పోర్టల్ లోకి ప్రవేశించండి →',

    badge_transporter: 'రవాణా నెట్‌వర్క్',
    role_logistics_title: 'రవాణాదారు',
    role_logistics_desc: 'గ్రామీణ ప్రాంతాల నుండి మార్కెట్లు మరియు వేర్‌హౌస్‌లకు రవాణా ట్రిప్పులను ఆమోదించండి. సరసమైన ధరలు, తక్షణ లోడింగ్ ఛార్జీలు.',
    feat_l1: '✓ ట్రాక్టర్, డీసీఎం, లారీ ట్రిప్ ఆర్డర్లు',
    feat_l2: '✓ OTP ఆధారిత లోడింగ్ & అన్‌లోడింగ్ వెరిఫికేషన్',
    feat_l3: '✓ తక్షణ రవాణా చార్జీల విడుదల',
    btn_enter_logistics: 'రవాణా పోర్టల్ లోకి ప్రవేశించండి →',

    stat_mandis: '6+',
    stat_mandis_sub: 'తెలంగాణ ప్రముఖ మార్కెట్లు',
    stat_escrow: '100%',
    stat_escrow_sub: 'ఎస్క్రో చెల్లింపు రక్షణ',
    stat_commission: '₹0',
    stat_commission_sub: 'రైతులకు మధ్యవర్తి కమీషన్',

    // Farmer Portal: Sidebar Navigation
    tab_bidding_arena: 'లైవ్ బిడ్డింగ్ వార్',
    tab_bidding_sub: 'కొనుగోలుదారుల లైవ్ బిడ్‌లు',
    tab_create_lot: 'కొత్త పంట లిస్ట్ చేయండి',
    tab_create_sub: 'డిమాండ్ ధరతో నమోదు',
    tab_charts: 'మార్కెట్ చార్ట్‌లు & ట్రెండ్స్',
    tab_charts_sub: 'ధరల హెచ్చుతగ్గుల గ్రాఫ్‌లు',
    tab_hold_vs_sell: 'అమ్మాలా? నిల్వ చేయాలా?',
    tab_hold_sub: 'AI గోదాము సలహాదారు',
    tab_orders_escrow: 'ఆర్డర్లు & ఎస్క్రో ట్రాకర్',
    tab_orders_sub: 'లారీ & OTP చెల్లింపులు',
    tab_ai_quality: 'AI పంట నాణ్యత స్కాన్',
    tab_quality_sub: 'తేమ & గ్రేడ్ విశ్లేషణ',
    tab_weather: 'వాతావరణం & వర్ష హెచ్చరికలు',
    tab_weather_sub: 'కల్లాల రాడార్ అలెర్ట్స్',
    tab_doc_verification: 'రైతు ధృవీకరణ పత్రాలు',
    tab_doc_sub: 'ధరణి & ఆధార్ KYC',
    tab_disputes: 'సమస్య పరిష్కారం',
    tab_disputes_sub: 'ఫిర్యాదు నమోదు & సహాయవాణి',
    sidebar_escrow_title: '🛡️ ఎస్క్రో రక్షిత మొత్తం',
    sidebar_escrow_desc: 'పొలం వద్ద OTP సరిచూశాక మాత్రమే లారీ బయలుదేరుతుంది. మీ డబ్బు సురక్షితం.',

    // Common Crop Names
    crop_teja_chilli: 'తేజ మిర్చి',
    crop_paddy: 'తెలంగాణ సోనా వరి',
    crop_cotton: 'పత్తి (తెల్ల బంగారం)',
    crop_turmeric: 'నిజామాబాద్ పసుపు',
    crop_red_gram: 'ఎర్ర కందులు',
    crop_maize: 'మొక్కజొన్న',
    crop_all: 'అన్ని పంటలు',

    // Storage Types
    storage_drying_yard: 'రైతు కల్లం / ఇల్లు',
    storage_warehouse: 'TSWC ప్రభుత్వ వేర్‌హౌస్',
    storage_cold_storage: 'కోల్డ్ స్టోరేజ్',

    // Quality Grades
    grade_all: 'అన్ని గ్రేడ్‌లు',
    grade_a: 'గ్రేడ్ A (ప్రీమియం ఎగుమతి రకం - తేమ < 10%)',
    grade_b: 'గ్రేడ్ B (ప్రామాణిక మార్కెట్ రకం - తేమ 10-12%)',
    grade_c: 'గ్రేడ్ C (సాధారణ రకం - తేమ > 12%)',
    grade_a_short: 'గ్రేడ్ A (ప్రీమియం)',
    grade_b_short: 'గ్రేడ్ B (ప్రామాణికం)',
    grade_c_short: 'గ్రేడ్ C (సాధారణం)',

    // Farmer Portal: Tab 1 (Bidding Arena)
    bidding_title: 'మీ పంటలపై లైవ్ కొనుగోలుదారుల పోటీ బిడ్డింగ్',
    bidding_desc: 'రైతుగా మీకే పూర్తి నిర్ణయాధికారం ఉంది. కేవలం ఎక్కువ ధర మాత్రమే కాకుండా, కొనుగోలుదారు రేటింగ్ మరియు సొంత వాహనం తెచ్చే సౌకర్యాన్ని బట్టి డీల్ ఎంచుకోండి.',
    btn_refresh_bids: 'రిఫ్రెష్ బిడ్‌లు',
    lot_status_live: 'లైవ్ బిడ్డింగ్ వార్',
    lot_qty_label: 'పరిమాణం:',
    lot_grade_label: 'గ్రేడ్ / నాణ్యత:',
    lot_location_label: 'ప్రదేశం:',
    lot_storage_label: 'నిల్వ ప్రదేశం:',
    lot_reserve_price: 'మీ రిజర్వ్ ధర (కనీసం)',
    lot_top_bid: 'ప్రస్తుత గరిష్ట బిడ్',
    lot_bids_count: 'వచ్చిన బిడ్‌లు',
    lot_farmer_autonomy: 'రైతుకు నచ్చిన బిడ్‌ను మాత్రమే ఎంచుకునే పూర్తి స్వేచ్ఛ ఉంది',
    lot_ends_in: 'ముగింపు సమయం:',
    btn_accept: 'ఆమోదించు',
    btn_counter: 'కౌంటర్',
    btn_reject: 'తిరస్కరించు',
    unit_quintal: 'క్వింటాల్',
    unit_quintals: 'క్వింటాళ్లు',
    logistics_buyer_truck: '🚛 కొనుగోలుదారుడే సొంత లారీ పంపుతారు (రైతుకు ఖర్చు ₹0)',
    logistics_transporter_req: '🚚 ప్లాట్‌ఫామ్ రవాణాదారుడు కావాలి',

    // Farmer Portal: Tab 2 (Create Lot)
    create_lot_title: 'పంట వివరాలు నమోదు చేయండి',
    create_lot_subtitle: 'మీరు వివరాలు నమోదు చేసిన వెంటనే తెలంగాణ మార్కెట్ డిమాండ్ ఆధారంగా సిఫారసు చేయబడిన సరైన ధర లెక్కిస్తాము.',
    lbl_crop_name: 'పంట పేరు *',
    lbl_variety: 'రకం / వెరైటీ *',
    lbl_quantity: 'మొత్తం పరిమాణం (క్వింటాళ్లలో) *',
    lbl_grade: 'నాణ్యతా గ్రేడ్ *',
    lbl_location: 'పొలం ఉన్న ప్రదేశం (మండలం & జిల్లా) *',
    lbl_storage_type: 'నిల్వ ఉన్న ప్రదేశం *',
    lbl_crop_photos: 'పంట అసలు ఫోటోలు *',
    upload_prompt: 'పంట ఫోటోను ఎంచుకోండి లేదా కెమెరాతో తీయండి',
    upload_hint: 'స్పష్టమైన ఫోటోలు పెడితే కొనుగోలుదారులు ఎక్కువ ధరకు బిడ్ వేస్తారు',
    preview_selected: 'ఎంచుకున్న ఫోటో సిద్ధంగా ఉంది',
    btn_ai_scan_fill: '🔬 AI నాణ్యత స్కాన్ చేసి ఆటో-ఫిల్ చేయండి',
    smart_ask_title: 'మార్కెట్ డిమాండ్ ఆధారిత ధర సలహాదారు',
    suggested_ask_label: 'సిఫారసు చేయబడిన బేస్ ధర:',
    reserve_price_label: 'మీ రిజర్వ్ కనీస ధర (క్వింటాలుకు) *',
    helper_reserve_price: 'ఈ ధర కంటే తక్కువగా ఏ కొనుగోలుదారు కూడా బిడ్ వేయలేరు. మీకే పూర్తి రక్షణ.',
    btn_publish_lot: '🚀 పంటను బిడ్డింగ్ కోసం లైవ్ చేయండి',
    mandi_snapshot_title: 'తెలంగాణ ప్రముఖ మార్కెట్ల రేట్లు',
    farmer_safety_title: 'రైతు భద్రతా హామీలు',
    safety_point_1: '100% ఎస్క్రో భద్రత: కొనుగోలుదారు ముందుగానే మొత్తం డిపాజిట్ చేయాలి.',
    safety_point_2: 'సొంత వాహన వెసులుబాటు: కొనుగోలుదారులే లారీ పంపేలా షరతు పెట్టవచ్చు.',
    safety_point_3: 'తూకం వద్ద పూర్తి రక్షణ: పొలం వద్ద డిజిటల్ తూకం తర్వాతే OTP ధృవీకరణ.',

    // Farmer Portal: Tab 3 (Market Charts)
    charts_title: 'తెలంగాణ మార్కెట్ ధరలు & రాకల ట్రెండ్స్',
    charts_desc: 'ఎనుమాముల వరంగల్, ఖమ్మం, నిజామాబాద్ మార్కెట్లలో రోజువారీ క్లియరింగ్ బిడ్లు మరియు రైతుల ఆస్క్ ధరల చారిత్రక విశ్లేషణ.',
    kpi_avg_price: 'ప్రస్తుత మార్కెట్ సగటు బిడ్',
    kpi_high_price: 'ఈ సీజన్ గరిష్ట రికార్డ్ ధర',
    kpi_arrivals: 'రోజువారీ మార్కెట్ రాకలు',
    kpi_signal: 'మార్కెట్ డిమాండ్ సిగ్నల్',
    legend_ask: 'రైతుల సగటు రిజర్వ్ ధర',
    legend_bid: 'కొనుగోలుదారుల ముగింపు బిడ్',
    legend_arrivals: 'మార్కెట్ రాకలు',
    timeframe_15d: '15 రోజులు',
    timeframe_30d: '30 రోజులు',
    timeframe_90d: '3 నెలలు',

    // Farmer Portal: Tab 4 (Hold vs Sell Advisor)
    advisor_heading: 'ఇప్పుడే అమ్మాలా? లేక గోదాములో దాచి తర్వాత అమ్మాలా?',
    advisor_sub: 'తెలంగాణ రాష్ట్ర గిడ్డంగుల సంస్థ నిల్వ ఖర్చులు మరియు రాబోయే 15 రోజుల ధరల అంచనాను విశ్లేషించి మీకు లాభదాయకమైన సలహా అందిస్తుంది.',
    tswc_title: '📍 సమీపంలోని తెలంగాణ ప్రభుత్వ వేర్‌హౌస్‌లు & కోల్డ్ స్టోరేజ్‌లు',
    opt_sell_today: '1. ఇప్పుడే మార్కెట్లో అమ్మితే',
    opt_hold_tswc: '2. ప్రభుత్వ గోదాములో 15 రోజులు నిల్వ చేస్తే',
    lbl_instant_cash: '• తక్షణ నగదు లభ్యత',
    lbl_storage_cost_zero: '• వేర్‌హౌస్ నిల్వ చార్జీలు: ₹0',
    lbl_no_risk: '• వాతావరణం లేదా పురుగుల రిస్క్: లేదు',
    lbl_price_hike: 'అంచనా ధర పెరుగుదల:',
    lbl_govt_rent: 'ప్రభుత్వ గోదాము అద్దె:',
    lbl_net_profit: 'అదనపు నికర లాభం:',
    lbl_distance_from_farm: 'మీ పొలం నుండి దూరం:',
    lbl_availability: 'లభ్యత:',
    lbl_govt_fee: 'ప్రభుత్వ అద్దె:',

    // Farmer Portal: Tab 5 (Orders & Escrow)
    orders_title: 'ఎస్క్రో చెల్లింపుల ట్రాకర్ & లైవ్ ఆర్డర్లు',
    orders_desc: 'కొనుగోలుదారు డబ్బు డిపాజిట్ చేయడం మొదలుకొని, మీ పొలం వద్ద OTP వెరిఫికేషన్ ద్వారా డబ్బు మీ బ్యాంక్ ఖాతాలో చేరేవరకు ప్రతి అడుగు పారదర్శకం.',
    btn_refresh_orders: '🔄 రిఫ్రెష్ ఆర్డర్లు',
    step_deal_accepted: '1. బిడ్ ఆమోదం',
    step_funds_locked: '2. ఎస్క్రో డిపాజిట్',
    step_truck_enroute: '3. లారీ రాక',
    step_farm_gate_otp: '4. పొలం వద్ద OTP',
    step_paid: '5. బ్యాంక్ చెల్లింపు విడుదల',
    assigned_vehicle_lbl: 'కేటాయించిన వాహనం:',
    driver_lbl: 'డ్రైవర్:',
    eta_lbl: 'రాక సమయం:',
    farm_otp_prompt: 'పొలం వద్ద డ్రైవర్‌కు చూపించాల్సిన OTP:',
    btn_verify_loading: '🔓 లోడింగ్ ధృవీకరించండి',
    btn_view_receipt: '📄 రశీదు చూడండి',
    order_paid_success: '✅ చెల్లింపు పూర్తయింది',
    order_id_lbl: 'ఆర్డర్ ఐడీ:',
    buyer_lbl: 'కొనుగోలుదారు:',
    escrow_secured_lbl: '🛡️ ఎస్క్రోలో భద్రంగా ఉంది:',

    // Farmer Portal: Tab 6 (Disputes)
    dispute_title: 'రైతు సమస్య పరిష్కార వేదిక',
    dispute_subtitle: 'కొనుగోలుదారు బరువులో తేడా చూపించినా, లారీ రాక ఆలస్యమైనా, లేదా చెల్లింపులో సమస్య ఉన్నా వెంటనే ఫిర్యాదు నమోదు చేయండి. పరిష్కారం అయ్యేవరకు ఎస్క్రో డబ్బు భద్రంగా నిలిపివేయబడుతుంది.',
    lbl_dispute_order: 'ఆర్డర్ / డీల్ ఐడీ *',
    lbl_dispute_category: 'సమస్య రకం *',
    lbl_dispute_desc: 'సమస్య పూర్తి వివరాలు *',
    btn_submit_dispute: '🚨 ఫిర్యాదు సమర్పించండి',
    helpline_title: 'తెలంగాణ రైతు సహాయవాణి',
    helpline_hours: 'ఉదయం 8:00 నుండి రాత్రి 8:00 వరకు అందుబాటులో ఉంటుంది',

    // Farmer Portal: Tab 7 (AI Quality)
    ai_quality_title: '🌾 AI పంట నాణ్యత & తేమ విశ్లేషణ',
    ai_quality_desc: 'పంట ఫోటో లేదా నమూనాను స్కాన్ చేసి క్షణాల్లో తేమ శాతం, నాణ్యతా గ్రేడ్ మరియు డిజిటల్ సర్టిఫికేట్ పొందండి. సర్టిఫైడ్ పంటలకు కొనుగోలుదారులు గరిష్ట ధర చెల్లిస్తారు.',
    lbl_scan_crop: 'విశ్లేషించాల్సిన పంటను ఎంచుకోండి:',
    btn_start_ai_scan: '🔬 AI స్కాన్ ప్రారంభించండి',
    btn_change_photo: '📷 ఫోటో మార్చండి',
    cert_title: '📋 AI నాణ్యత ధృవీకరణ పత్రం',
    moisture_metric_lbl: 'తేమ శాతం:',
    color_metric_lbl: 'రంగు స్వచ్ఛత & తీక్షణత:',
    cleanliness_metric_lbl: 'విదేశీ పదార్థాలు / మట్టి రహితం:',
    defect_metric_lbl: 'మచ్చలు లేదా పురుగు దెబ్బతిన్న కాయలు:',
    premium_advantage_title: 'మార్కెట్ ప్రీమియం అడ్వాంటేజ్:',
    btn_list_with_quality: '🚀 ఈ నాణ్యతతో పంటను వెంటనే లిస్ట్ చేయండి →',

    // Farmer Portal: Tab 8 (Weather)
    weather_title: '🌦️ తెలంగాణ వాతావరణం & అకాల వర్ష హెచ్చరికలు',
    weather_desc: 'కల్లాలలో మరియు మార్కెట్ యార్డులలో ఆరబోసిన మిర్చి, ధాన్యం, పసుపు పంటలను రక్షించడానికి ప్రత్యక్ష ఉపగ్రహ వాతావరణ నిఘా & కల్లం ఆరబెట్టు సూచిక.',
    btn_live_gps_refresh: '🔄 లైవ్ GPS రీఫ్రెష్',
    rain_alarm_title: 'అకాల వర్ష హెచ్చరిక: రాబోయే 36 గంటల్లో వర్ష సూచన!',
    rain_alarm_desc: 'వరంగల్ మరియు పరిసర మండలాల్లో తేలికపాటి నుండి మోస్తరు వర్షాలు మరియు ఈదురుగాలులు వీచే అవకాశం ఉంది. కల్లాలలో ఆరబోసిన పంటలపై టార్పాలిన్ పట్టాలు కప్పి భద్రపరచండి.',
    humidity_lbl: 'గాలిలో తేమ:',
    rain_chance_lbl: 'వర్ష సంభావ్యత:',
    drying_index_lbl: 'కల్లం ఆరబెట్టు సూచిక:',
    forecast_heading: '📅 రాబోయే 5 రోజుల వ్యవసాయ వాతావరణ అంచనా',
    weather_rain_lbl: 'వర్షం:',

    // Farmer Portal: Tab 9 (KYC)
    kyc_heading: '📑 రైతు ధృవీకరణ పత్రాలు & రియల్ టైమ్ KYC',
    kyc_subheading: 'ఆధార్ కార్డ్, ధరణి పాస్‌బుక్, లైవ్ IFSC బ్యాంక్ ఖాతా, పాన్ కార్డ్ మరియు నివాస ధృవీకరణ పత్రాలను అప్‌లోడ్ చేసి మీ ప్రొఫైల్‌ను 100% ధృవీకరించండి. సర్టిఫైడ్ రైతులకు వ్యాపారులు తక్షణమే ఎస్క్రో నిధులను లాక్ చేస్తారు.',
    kyc_progress_title: 'రైతు ప్రొఫైల్ ధృవీకరణ శాతం',
    kyc_btn_refresh: '🔄 స్థితిని రీఫ్రెష్ చేయండి',
    kyc_status_verified: '✓ ధృవీకరించబడింది',
    kyc_status_pending: '⏳ అప్‌లోడ్ చేయండి',
    kyc_badge_100: '100% కిసాన్ గోల్డ్ ధృవీకరణ పూర్తయింది',
    kyc_badge_partial: 'మధ్యంతర ధృవీకరణ',

    // Buyer Portal Navigation & Sections
    buyer_title: '🏢 కొనుగోలుదారు పోర్టల్',
    buyer_tab_lots: 'రైతుల పంటల వేలం',
    buyer_tab_lots_sub: 'లైవ్ హార్వెస్ట్ మార్కెట్',
    buyer_tab_bids: 'నా బిడ్‌లు & సంప్రదింపులు',
    buyer_tab_bids_sub: 'నెగోషియేషన్స్ & కౌంటర్లు',
    buyer_tab_orders: 'సేకరణ ఆర్డర్లు & ఎస్క్రో',
    buyer_tab_orders_sub: 'లారీ ట్రాకింగ్ & OTP విడుదల',
    buyer_tab_rfq: 'కొనుగోలు డిమాండ్',
    buyer_tab_rfq_sub: 'బల్క్ టెండర్లు పోస్ట్ చేయండి',
    buyer_tab_arbitrage: 'మార్కెట్ ఇంటెలిజెన్స్ & పొదుపు',
    buyer_tab_arbitrage_sub: 'మండి వర్సెస్ డైరెక్ట్ పొదుపు',
    buyer_escrow_title: '🛡️ ఎస్క్రో ఖాతా నిల్వ',
    buyer_escrow_note: 'రైతు పొలం వద్ద ధాన్యం తూకం వేసి OTP ధృవీకరించిన తర్వాతే మీ ఎస్క్రో నుండి పేమెంట్ విడుదలవుతుంది.',
    btn_add_funds: '+ నిధులు జత చేయండి',
    buyer_lots_banner: 'రైతుల పంటల వేలం & నేరుగా సేకరణ',
    buyer_lots_desc: 'తెలంగాణ రైతులు మరియు రైతు సంఘాల నుండి నేరుగా తేజ మిర్చి, తెలంగాణ సోనా వరి, పత్తి, పసుపు లాట్లను వేలం ద్వారా సేకరించండి. మధ్యవర్తి కమీషన్లు లేవు.',
    buyer_search_placeholder: 'పంట పేరు, ఊరు లేదా రైతు లాట్ ఐడీతో వెతకండి...',
    btn_place_bid: '⚡ బిడ్ వేయండి',
    btn_assign_truck: '🚛 వాహనాన్ని కేటాయించండి',
    btn_post_rfq: '📝 కొత్త టెండర్ పోస్ట్ చేయండి',
    btn_calc_arbitrage: '📊 పొదుపును లెక్కించండి',
    buyer_bids_banner: 'మీరు వేసిన బిడ్‌లు & సంప్రదింపులు',
    buyer_bids_desc: 'మీరు వివిధ రైతుల లాట్లపై వేసిన బిడ్‌ల స్థితిని ఇక్కడ గమనించండి. ఎవరైనా ఎక్కువ బిడ్ వేస్తే వెంటనే ధర పెంచండి లేదా రైతు కౌంటర్ ఆఫర్‌ను ఆమోదించండి.',
    buyer_orders_banner: 'సేకరణ ఆర్డర్లు & లారీ రవాణా ట్రాకర్',
    buyer_orders_desc: 'ఖరారైన డీల్స్ కోసం సొంత లారీని కేటాయించండి. పొలం వద్ద డ్రైవర్ సరుకును తూకం వేసిన తర్వాత రైతు ఇచ్చే OTPని నమోదు చేసి తక్షణమే పేమెంట్ విడుదల చేయండి.',
    buyer_rfq_banner: 'బల్క్ కొనుగోలు టెండర్ నమోదు చేయండి',
    buyer_rfq_desc: 'మీ ప్రాసెసింగ్ యూనిట్ లేదా మిల్లుకు అవసరమైన భారీ పరిమాణాలను డిమాండ్ పోస్ట్‌గా పెట్టండి. తెలంగాణలోని 100+ రైతు ఉత్పత్తిదారుల సంఘాలు నేరుగా స్పందిస్తాయి.',
    buyer_arbitrage_banner: 'మార్కెట్ ఇంటెలిజెన్స్ & డైరెక్ట్ సేకరణ పొదుపు',
    buyer_arbitrage_desc: 'సాంప్రదాయ మార్కెట్ యార్డ్ (మండి) తో పోలిస్తే రైతుల వద్ద నుండి నేరుగా కొనడం వల్ల ఆదా అయ్యే కమీషన్, రవాణా, లేబర్ చార్జీల గణాంకాలు.',
    buyer_lot_loading: 'రైతుల లైవ్ పంట లాట్లను లోడ్ చేస్తున్నాము...',
    buyer_lot_empty: 'ప్రస్తుతం అమ్మకానికి అందుబాటులో పంట లాట్లు లేవు',
    buyer_bids_empty: 'మీరు ఇంకా ఏ పంట లాట్‌పై బిడ్ వేయలేదు',
    buyer_orders_empty: 'ఖరారైన సేకరణ ఆర్డర్లు ఏవీ లేవు',
    buyer_qty_lbl: 'పరిమాణం:',
    buyer_moisture_lbl: 'తేమ శాతం:',
    buyer_location_lbl: 'రైతు ప్రదేశం:',
    buyer_farmer_lbl: 'రైతు పేరు:',
    buyer_reserve_lbl: 'రైతు రిజర్వ్ ధర:',
    buyer_highest_lbl: 'ప్రస్తుత గరిష్ట బిడ్:',
    buyer_leading_status: '🟢 గరిష్ట బిడ్',
    buyer_outbid_status: '🔴 ఎక్కువ బిడ్ వచ్చింది',
    buyer_awaiting_farmer: 'రైతు ఆమోదం కోసం వేచి చూస్తున్నారు',
    buyer_raise_bid_btn: 'మళ్లీ బిడ్ వేయండి',
    buyer_assigned_truck_lbl: 'కేటాయించిన లారీ:',
    buyer_driver_details_lbl: 'డ్రైవర్ వివరాలు:',
    buyer_btn_assign_truck: '🚛 లారీ కేటాయించండి',
    buyer_btn_enter_otp: '🔑 OTP నమోదు చేయండి',
    buyer_btn_view_invoice: '📄 ఇన్వాయిస్ చూడండి',

    // Logistics Portal Navigation & Sections
    logistics_title: '🚛 రవాణాదారు పోర్టల్',
    logistics_trips_title: 'గ్రామీణ వ్యవసాయ రవాణా ట్రిప్పుల వేదిక',
    logistics_trips_desc: 'రైతుల పొలాల వద్ద నుండి మిల్లులు మరియు గోదాములకు పంటలను తరలించే ట్రిప్పులను ఆమోదించండి. OTP ఆధారిత లోడింగ్ ద్వారా తక్షణ రవాణా చార్జీలు పొందండి.',
    btn_refresh_trips: '🔄 రిఫ్రెష్ ట్రిప్పులు',
    filter_all_trips: 'అన్నీ',
    filter_available_trips: '⚡ అందుబాటులో ఉన్నవి',
    filter_assigned_trips: '🚛 కేటాయించబడినవి',
    filter_delivered_trips: '✅ పూర్తయినవి',
    btn_accept_trip: '✓ ట్రిప్ ఆమోదించు',
    btn_cancel: 'రద్దు చేయండి',
    trip_origin_lbl: '📍 బయలుదేరే స్థలం:',
    trip_dest_lbl: '🏁 గమ్యస్థానం:',
    trip_dist_lbl: 'అంచనా దూరం:',
    trip_vehicle_lbl: 'వాహనం:',
    trip_freight_lbl: 'రవాణా చార్జీలు:',
    trip_assigned_lbl: '🚛 కేటాయించబడింది:',
    trip_driver_lbl: 'డ్రైవర్:',
    trip_status_available: 'లభ్యంగా ఉంది',
    trip_status_in_transit: 'రవాణాలో ఉంది',
    trip_status_delivered: 'పూర్తయింది',
    btn_take_trip: '✓ ట్రిప్ తీసుకోండి',
    btn_verify_otp: '🔑 OTP ధృవీకరించు',
    payout_released: '✓ ఛార్జీలు చెల్లించబడ్డాయి',
    lbl_vehicle_reg: 'కేటాయించే వాహనం రిజిస్ట్రేషన్ *',
    lbl_driver_name: 'డ్రైవర్ పేరు *',
    lbl_driver_mobile: 'మొబైల్ నంబర్ *',

    // Modals
    auth_phone_title: 'రైతు మొబైల్ లాగిన్',
    auth_phone_sub: 'మీ 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి. తక్షణమే OTP పంపబడుతుంది.',
    btn_send_otp: 'OTP పంపండి →',
    auth_otp_title: 'OTP వెరిఫికేషన్',
    otp_sent_to: 'ఈ నంబర్‌కు 6 అంకెల OTP పంపబడింది:',
    btn_verify_enter: 'వెరిఫై చేసి ప్రవేశించండి →',
    counter_title: 'కొనుగోలుదారుకు ఎదురు ప్రతిపాదన',
    accept_trip_title: 'రవాణా ట్రిప్ ఆమోదించండి',
    assign_truck_title: 'లారీ మరియు డ్రైవర్‌ను కేటాయించండి',
    place_bid_modal_title: 'రైతు లాట్‌పై బిడ్ వేయండి',
    bid_rate_label: 'మీ బిడ్ ధర (క్వింటాలుకు) *',
    bid_logistics_mode: 'రవాణా నిర్వహణ పద్ధతి:',
    opt_buyer_vehicle: '🚛 కొనుగోలుదారుడే సొంత వాహనాన్ని పంపుతారు (రైతుకు ఖర్చు ₹0)',
    total_deal_valuation: 'మొత్తం డీల్ విలువ:',
    btn_confirm_bid: '🚀 బిడ్ సమర్పించండి',

    // Buyer RFQ & Arbitrage
    lbl_rfq_crop: 'కావాల్సిన పంట *',
    lbl_rfq_qty: 'కావాల్సిన మొత్తం పరిమాణం (క్వింటాళ్లు) *',
    lbl_rfq_price: 'మీరు ఇచ్చే గరిష్ట కొనుగోలు ధర (రూ/క్వింటాల్) *',
    lbl_rfq_location: 'డెలివరీ లేదా సేకరణ ప్రదేశం *',
    lbl_rfq_validity: 'టెండర్ చెల్లుబాటు వ్యవధి *',
    btn_publish_rfq: '📢 బల్క్ టెండర్‌ను పబ్లిష్ చేయండి',
    rfq_active_title: '📋 ప్రస్తుతం లైవ్‌లో ఉన్న మీ సంస్థ టెండర్లు',
    lbl_truck_eta: 'పొలం వద్దకు చేరుకునే అంచనా సమయం *',
    btn_dispatch_truck: '🚛 లారీని డిస్పాచ్ చేయండి →',
    calc_savings_header: '💰 మీ వార్షిక సేకరణ పొదుపును లెక్కించండి',
    calc_savings_desc: 'సాంప్రదాయ మార్కెట్లలో దళారుల కమీషన్ 4-6 శాతం, లోడింగ్ వ్యర్థాలు 2 శాతం, మరియు అదనపు ఖర్చులను కిసాన్ కనెక్ట్ పూర్తిగా రద్దు చేస్తుంది.',
    lbl_select_crop: 'పంట ఎంచుకోండి:',
    lbl_purchase_qty: 'మీ కొనుగోలు పరిమాణం (క్వింటాళ్లలో):',
    lbl_net_savings_card: 'ఈ డీల్‌లో మీ సంస్థకు లభించే నికర పొదుపు:',
    lbl_savings_percent_tag: 'సాంప్రదాయ మండి కమీషన్ల కంటే 9.2% ఆదా',
    lbl_commission_saved: 'రద్దయిన దళారి కమీషన్ (5%):',
    lbl_transparency_guarantee: 'పొలం వద్ద ప్రత్యక్ష తూకం రక్షణ:',
    lbl_time_saved: 'సేవ్ అయిన సమయం:',
    lbl_hours_24: '24 గంటలు',
    lbl_transparency_100: '100% పారదర్శకత',
    btn_close: 'మూసివేయండి',
    btn_print_pdf: '🖨️ ప్రింట్ / PDF డౌన్‌లోడ్',
    inv_title: 'రైతు పొలం వద్ద డైరెక్ట్ APMC ఇన్వాయిస్',
    inv_date_lbl: 'తేదీ:',
    inv_commodity_col: 'వివరణ',
    inv_qty_col: 'పరిమాణం',
    inv_rate_col: 'ధర / క్వింటాల్',
    inv_total_col: 'మొత్తం',
    inv_subtotal: 'మొత్తం సరుకు విలువ:',
    inv_apmc_cess: 'తెలంగాణ APMC సెస్ (₹0 - డైరెక్ట్ ఫార్మ్ ఎగ్జెంప్షన్):',
    inv_net_payout: 'రైతుకు ఎస్క్రో ద్వారా చెల్లించిన నికర మొత్తం:',
    inv_footer_note: 'ఈ ఇన్వాయిస్ తెలంగాణ వ్యవసాయ ఉత్పత్తుల చట్టం క్రింద పొలం వద్ద OTP ధృవీకరణ ద్వారా ఎస్క్రో రిలీజ్ చేయబడినది.',

    // Farmer Portal Modals & Actions
    counter_price_lbl: 'మీ ఎదురు ప్రతిపాదన ధర (క్వింటాల్‌కు) *',
    counter_unit_symbol: '/ క్వింటాల్',
    counter_vehicle_req: 'కొనుగోలుదారుడే సొంత లారీని పొలం వద్దకు పంపించాలి',
    btn_submit_counter: 'ఎదురు ప్రతిపాదన పంపండి →',
    doc_preview_title: '📄 పత్రం పరిశీలన',
    doc_preview_sub: 'అప్‌లోడ్ చేయబడిన అసలు పత్రం పరిశీలన',
    btn_download_preview_doc: '📥 డౌన్‌లోడ్ చేయండి',
    confirm_deal_title: 'బిడ్ ఆమోదం & ఎస్క్రో భద్రత',
    confirm_deal_sub: 'కొనుగోలుదారుతో ఒప్పందం ఖరారు చేయడం',
    deal_buyer_lbl: 'కొనుగోలుదారు:',
    deal_crop_qty_lbl: 'పంట & పరిమాణం:',
    deal_price_lbl: 'ఆమోదిత ధర:',
    deal_logistics_lbl: 'రవాణా నిబంధన:',
    deal_total_escrow_lbl: 'మొత్తం ఎస్క్రో చెల్లింపు:',
    deal_escrow_notice: '🛡️ ఎస్క్రో భద్రత: ఆమోదించిన వెంటనే ఈ మొత్తం బ్యాంకు ఎస్క్రోలో లాక్ అవుతుంది. మీ పొలం వద్ద లోడింగ్ పూర్తయి OTP చెప్పేవరకు మీ పంట మరియు డబ్బు రెండూ 100% సురక్షితం.',
    btn_confirm_deal: '✓ ఒప్పందం ఖరారు చేసి ఎస్క్రో లాక్ చేయండి',
    farm_gate_otp_title: 'పొలం వద్ద లోడింగ్ ధృవీకరణ',
    farm_gate_otp_sub: 'డ్రైవర్ లేదా కొనుగోలుదారు ప్రతినిధి వద్ద ఉన్న 4 అంకెల కోడ్ నమోదు చేసి ఎస్క్రో నిధులను తక్షణమే విడుదల చేయండి.',
    farm_gate_otp_warning: '⚠️ ముఖ్యమైన సూచన: లారీలో తూకం సరిచూసుకుని, పంటను పూర్తిగా ఎక్కించిన తర్వాత మాత్రమే కోడ్ ధృవీకరించండి.',
    farm_gate_otp_lbl: '4 అంకెల లోడింగ్ కోడ్:',
    btn_verify_release_funds: '🔓 ధృవీకరించి నిధులు విడుదల చేయండి →',
    receipt_brand: '🌾 కిసాన్ కనెక్ట్',
    receipt_gov_sub: 'తెలంగాణ వ్యవసాయ మార్కెట్ వేదిక • డిజిటల్ ఎస్క్రో చెల్లింపు రశీదు',
    receipt_order_id_lbl: 'రశీదు / ఆర్డర్ సంఖ్య:',
    receipt_utr_lbl: 'బ్యాంకింగ్ రిఫరెన్స్ సంఖ్య:',
    receipt_farmer_lbl: 'లబ్ధిదారు రైతు:',
    receipt_farmer_name: 'మల్లారెడ్డి',
    receipt_buyer_lbl: 'కొనుగోలుదారు:',
    receipt_bank_lbl: 'జమ చేయబడిన బ్యాంక్ ఖాతా:',
    receipt_bank_val: 'SBI (SBIN0020194) - జనగాం',
    receipt_mode_lbl: 'చెల్లింపు విధానం:',
    receipt_mode_val: 'తక్షణ ఎస్క్రో IMPS/RTGS (ఉచితం - ₹0 ఫీజు)',
    receipt_col_desc: 'పంట వివరాలు',
    receipt_col_qty: 'పరిమాణం',
    receipt_col_rate: 'ధర / క్వింటాల్',
    receipt_col_amount: 'మొత్తం',
    receipt_crop_name: 'తేజ మిర్చి',
    receipt_crop_variety: 'ఎగుమతి గ్రేడ్ A • 9.2% తేమ',
    receipt_apmc_cess: 'మార్కెట్ సెస్ (0%)',
    receipt_escrow_fee: 'ఎస్క్రో సేవా రుసుము (ఉచితం - ₹0)',
    receipt_net_farmer_total: 'రైతుకు జమ చేయబడిన నికర మొత్తం:',
    receipt_footer_note: 'ఈ రశీదు కిసాన్ కనెక్ట్ ఎస్క్రో ద్వారా డిజిటల్ సంతకం చేయబడింది. భౌతిక సంతకం అవసరం లేదు.',
    btn_print_receipt: '🖨️ రశీదు ప్రింట్ / PDF సేవ్',
    api_settings_title: '⚙️ అమరికలు & జియోలొకేషన్ సెట్టింగ్స్',
    api_settings_sub: 'కిసాన్ కనెక్ట్ డిఫాల్ట్‌గా ఉచిత, కీలు అవసరం లేని లైవ్ సేవలను ఉపయోగిస్తుంది. మీరు మీ స్వంత ప్రైవేట్ API కీలను ఉపయోగించాలనుకుంటే ఇక్కడ నమోదు చేయవచ్చు.',
    api_weather_lbl: 'వాతావరణ API కీ (ఐచ్ఛికం)',
    api_weather_hint: 'ఖాళీగా ఉంచితే డిఫాల్ట్ హై-ఆక్యురసీ లైవ్ వాతావరణ సేవ పనిచేస్తుంది.',
    api_maps_lbl: 'మ్యాప్స్ & జియోకోడింగ్ API కీ (ఐచ్ఛికం)',
    api_maps_hint: 'ఖాళీగా ఉంచితే డిఫాల్ట్ రివర్స్ జియోకోడింగ్ పనిచేస్తుంది.',
    btn_save_api_settings: '💾 సెట్టింగ్స్ భద్రపరచండి'
  },

  en: {
    // Portal Document Titles
    page_title_main: 'Kissan Connect | Telangana Agri Market Linkage Platform',
    page_title_farmer: 'Kissan Connect | Farmer Portal',
    page_title_buyer: 'Kissan Connect | Commercial Buyer Portal',
    page_title_logistics: 'Kissan Connect | Logistics Fleet Portal',

    // Top Bar & Branding
    ticker_title: 'Telangana Live Mandi Rates',
    tagline_gov: 'Telangana Agri Market Linkage Platform • SIH 26132',
    hero_title: 'Kissan Connect',
    hero_subtitle: 'A farmer-first digital agri marketplace. Direct selling without middlemen, live competitive buyer bidding, and 100% secured escrow payouts.',
    badge_farmer_portal: 'Farmer Portal',
    badge_buyer_portal: 'Commercial Buyer Portal',
    badge_logistics_portal: 'Logistics Fleet Portal',
    nav_home: 'Home',
    btn_switch_role: 'Switch Role',
    btn_switch_role_text: 'Switch Role (Back to Home)',
    wallet_escrow_label: 'Escrow Funds:',
    escrow_deposit_label: 'Escrow Deposit:',
    total_earned_label: 'Total Earnings:',
    business_firm_label: 'Enterprise Firm:',
    rythubandhu_badge: '✓ Rythubandhu Verified Farmer',
    verified_apmc_badge: '✓ APMC License Verified',
    safe_100_badge: '100% Secure',

    // User Profile Names & Places
    farmer_profile_name: 'Malla Reddy',
    farmer_profile_village: '📍 Jangaon, Warangal Dist',
    buyer_firm_1: 'ITC Agri Business Hub (Secunderabad)',
    buyer_firm_2: 'Sri Krishna Modern Rice Mills (Miryalaguda)',
    buyer_firm_3: 'Khammam Spices Exporters (Khammam)',

    // Role Chooser (Main Portal)
    badge_farmer_empowered: 'Farmer in Full Control',
    role_farmer_title: 'I am a Farmer',
    role_farmer_desc: 'Quote your price based on real-time market demand. Watch verified buyers outbid each other and pick your best offer.',
    feat_f1: '✓ Direct listing with crop photos & quality specs',
    feat_f2: '✓ Live competitive bidding war – you decide who wins',
    feat_f3: '✓ Escrow guarantee – money goes directly to your bank',
    btn_instant_login: '⚡ Instant Farmer Login →',
    btn_enter_farmer: '📱 Mobile OTP Login',
    btn_demo_login: '⚡ Demo Login (Skip OTP) →',
    btn_skip_otp: '⚡ Enter Directly (Skip OTP)',

    badge_buyer: 'Verified Commercial Buyers',
    role_buyer_title: 'Commercial Buyer',
    role_buyer_desc: 'Procure high-quality grain, chilli, and cotton directly from Telangana farmers & FPOs through transparent bidding.',
    feat_b1: '✓ Direct farm-gate procurement',
    feat_b2: '✓ Transparent digital bidding & RFQs',
    feat_b3: '✓ Standardized quality grading & digital invoicing',
    btn_enter_buyer: 'Enter Commercial Buyer Portal →',

    badge_transporter: 'Rural Logistics Fleet',
    role_logistics_title: 'Transporter',
    role_logistics_desc: 'Accept produce haulage trips from rural villages to mandis and warehouses with upfront rates and guaranteed loading payments.',
    feat_l1: '✓ Tractor, DCM & Truck trip orders',
    feat_l2: '✓ OTP-based loading & unloading verification',
    feat_l3: '✓ Instant freight payout release',
    btn_enter_logistics: 'Enter Logistics Portal →',

    stat_mandis: '6+',
    stat_mandis_sub: 'Major Telangana Mandis',
    stat_escrow: '100%',
    stat_escrow_sub: 'Escrow Payment Protection',
    stat_commission: '₹0',
    stat_commission_sub: 'Middlemen Commission for Farmers',

    // Farmer Portal: Sidebar Navigation
    tab_bidding_arena: 'Live Bidding War',
    tab_bidding_sub: 'Real-Time Incoming Bids',
    tab_create_lot: 'List New Crop Lot',
    tab_create_sub: 'Demand-Based Pricing',
    tab_charts: 'Market Charts & Trends',
    tab_charts_sub: 'Price Fluctuation Graphs',
    tab_hold_vs_sell: 'Hold or Sell? (AI Advisor)',
    tab_hold_sub: 'Warehouse Profitability Advisor',
    tab_orders_escrow: 'Orders & Escrow Tracker',
    tab_orders_sub: 'Trucks & OTP Settlements',
    tab_ai_quality: 'AI Crop Quality Scan',
    tab_quality_sub: 'Moisture & Grade Analysis',
    tab_weather: 'Agri Weather & Rain Radar',
    tab_weather_sub: 'Drying Yard Radar Alerts',
    tab_doc_verification: 'Farmer Credentials & KYC',
    tab_doc_sub: 'Dharani Land & Bank KYC',
    tab_disputes: 'Dispute Redressal',
    tab_disputes_sub: 'Grievance Support & Helpline',
    sidebar_escrow_title: '🛡️ Escrow Protected Funds',
    sidebar_escrow_desc: 'Truck departs only after farm-gate OTP verification. Your payment is 100% secured.',

    // Common Crop Names
    crop_teja_chilli: 'Teja Red Chilli',
    crop_paddy: 'Telangana Sona Paddy',
    crop_cotton: 'Raw White Cotton',
    crop_turmeric: 'Nizamabad Turmeric',
    crop_red_gram: 'Red Gram (Toor)',
    crop_maize: 'Yellow Maize',
    crop_all: 'All Crops',

    // Storage Types
    storage_drying_yard: 'On-Farm Drying Yard / Home',
    storage_warehouse: 'TSWC State Warehouse',
    storage_cold_storage: 'Cold Storage Facility',

    // Quality Grades
    grade_all: 'All Grades',
    grade_a: 'Grade A (Export Quality - Moisture < 10%)',
    grade_b: 'Grade B (Standard Market - Moisture 10-12%)',
    grade_c: 'Grade C (Fair Average - Moisture > 12%)',
    grade_a_short: 'Grade A (Premium)',
    grade_b_short: 'Grade B (Standard)',
    grade_c_short: 'Grade C (Fair)',

    // Farmer Portal: Tab 1 (Bidding Arena)
    bidding_title: 'Live Buyer Bidding War on Your Harvest',
    bidding_desc: 'As a farmer, you hold all bargaining power. Select the winner based on highest price, buyer credibility rating, and whether they arrange pickup vehicles.',
    btn_refresh_bids: 'Refresh Bids',
    lot_status_live: 'Live Bidding War',
    lot_qty_label: 'Quantity:',
    lot_grade_label: 'Grade / Quality:',
    lot_location_label: 'Location:',
    lot_storage_label: 'Storage Facility:',
    lot_reserve_price: 'Your Minimum Reserve Price',
    lot_top_bid: 'Current Highest Bid',
    lot_bids_count: 'Incoming Bids',
    lot_farmer_autonomy: 'Farmer holds full autonomy to accept any bid',
    lot_ends_in: 'Auction Ends In:',
    btn_accept: 'Accept',
    btn_counter: 'Counter',
    btn_reject: 'Reject',
    unit_quintal: 'Quintal',
    unit_quintals: 'Quintals',
    logistics_buyer_truck: '🚛 Buyer arranges own truck (₹0 farmer cost)',
    logistics_transporter_req: '🚚 Platform transporter requested',

    // Farmer Portal: Tab 2 (Create Lot)
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
    upload_hint: 'Clear harvest photos attract higher buyer bids',
    preview_selected: 'Selected photo ready',
    btn_ai_scan_fill: '🔬 AI Scan & Auto-Fill Specs',
    smart_ask_title: 'Demand-Based Smart Ask Price Engine',
    suggested_ask_label: 'Recommended Ask Range:',
    reserve_price_label: 'Your Minimum Reserve Price (Per Quintal) *',
    helper_reserve_price: 'Buyers cannot bid below this floor price. You are 100% protected.',
    btn_publish_lot: '🚀 Publish Harvest to Live Bidding Arena',
    mandi_snapshot_title: 'Key Telangana Mandi Rates',
    farmer_safety_title: 'Farmer Safety Guarantees',
    safety_point_1: '100% Escrow Security: Buyer must deposit full contract amount in advance.',
    safety_point_2: 'Farm-Gate Transport: Buyers can arrange their own lorry to pick up at your farm.',
    safety_point_3: 'Farm-Gate Protection: Payment releases only when you verify digital weighment and OTP.',

    // Farmer Portal: Tab 3 (Market Charts)
    charts_title: 'Telangana Market Price Trends & Arrivals',
    charts_desc: 'Historical analysis of clearing bids, farmer asks, and daily arrivals in Warangal, Khammam, and Nizamabad mandis.',
    kpi_avg_price: 'Current Market Average Bid',
    kpi_high_price: 'Season Record High Price',
    kpi_arrivals: 'Daily Mandi Arrivals',
    kpi_signal: 'Market Demand Signal',
    legend_ask: 'Farmer Average Ask Price',
    legend_bid: 'Buyer Clearing Bid',
    legend_arrivals: 'Arrivals Volume',
    timeframe_15d: '15 Days',
    timeframe_30d: '30 Days',
    timeframe_90d: '3 Months',

    // Farmer Portal: Tab 4 (Hold vs Sell Advisor)
    advisor_heading: 'Should You Sell Now or Hold in Warehouse?',
    advisor_sub: 'Analyzes 15-day price projections vs. Telangana State Warehousing Corporation (TSWC) cold storage costs to give you maximum net realization.',
    tswc_title: '📍 Nearby Telangana State Warehouses (TSWC)',
    opt_sell_today: '1. If Sold in Market Today',
    opt_hold_tswc: '2. If Held in TSWC Warehouse for 15 Days',
    lbl_instant_cash: '• Instant Cash Realization',
    lbl_storage_cost_zero: '• Warehouse Storage Cost: ₹0',
    lbl_no_risk: '• Spoilage & Pest Risk: None',
    lbl_price_hike: 'Projected Price Appreciation:',
    lbl_govt_rent: 'Govt Warehouse Tariff:',
    lbl_net_profit: 'Net Additional Gain:',
    lbl_distance_from_farm: 'Distance from Farm:',
    lbl_availability: 'Availability:',
    lbl_govt_fee: 'Govt Storage Rate:',

    // Farmer Portal: Tab 5 (Orders & Escrow)
    orders_title: 'Escrow Payout Tracker & Active Orders',
    orders_desc: 'From buyer escrow funding to farm-gate OTP verification, every milestone is transparently tracked until money is credited into your account.',
    btn_refresh_orders: '🔄 Refresh Orders',
    step_deal_accepted: '1. Deal Accepted',
    step_funds_locked: '2. Funds Locked in Escrow',
    step_truck_enroute: '3. Truck Dispatched',
    step_farm_gate_otp: '4. Farm-Gate OTP',
    step_paid: '5. Paid to Bank Account',
    assigned_vehicle_lbl: 'Assigned Vehicle:',
    driver_lbl: 'Driver:',
    eta_lbl: 'Estimated Arrival:',
    farm_otp_prompt: 'Farm-Gate OTP for Driver:',
    btn_verify_loading: '🔓 Verify Loading & OTP',
    btn_view_receipt: '📄 View Receipt',
    order_paid_success: '✅ Payment Completed',
    order_id_lbl: 'Order ID:',
    buyer_lbl: 'Buyer:',
    escrow_secured_lbl: '🛡️ Secured in Escrow:',

    // Farmer Portal: Tab 6 (Disputes)
    dispute_title: 'Farmer Grievance & Dispute Redressal',
    dispute_subtitle: 'Report weight scale discrepancies, vehicle delays, or unfair grading. Escrow funds remain safely frozen until resolution.',
    lbl_dispute_order: 'Select Order ID *',
    lbl_dispute_category: 'Dispute Category *',
    lbl_dispute_desc: 'Detailed Description of Issue *',
    btn_submit_dispute: '🚨 Raise Dispute Ticket',
    helpline_title: 'Telangana Farmer Support Line',
    helpline_hours: 'Available 8:00 AM to 8:00 PM Daily',

    // Farmer Portal: Tab 7 (AI Quality)
    ai_quality_title: '🌾 AI Crop Quality & Moisture Assessment',
    ai_quality_desc: 'Scan crop samples to evaluate moisture %, quality grade, and get a certified score. Certified lots attract top buyer bids.',
    lbl_scan_crop: 'Select Crop to Analyze:',
    btn_start_ai_scan: '🔬 Start AI Quality Scan',
    btn_change_photo: '📷 Change Photo',
    cert_title: '📋 AI Quality Certificate',
    moisture_metric_lbl: 'Moisture Content:',
    color_metric_lbl: 'Color Intensity & Purity:',
    cleanliness_metric_lbl: 'Cleanliness & Freedom from Foreign Matter:',
    defect_metric_lbl: 'Defective / Damaged Pods:',
    premium_advantage_title: 'Market Premium Advantage:',
    btn_list_with_quality: '🚀 List Harvest with this Quality Grade →',

    // Farmer Portal: Tab 8 (Weather)
    weather_title: '🌦️ Telangana Agri Weather & Rain Radar',
    weather_desc: 'Live satellite meteorological tracking and drying yard radar to protect sun-drying chilli, grain, and turmeric from unseasonal rains.',
    btn_live_gps_refresh: '🔄 Live GPS Refresh',
    rain_alarm_title: 'Rain Alert: Unseasonal Rains Expected within 36 Hours!',
    rain_alarm_desc: 'Moderate showers and gusty winds predicted across Warangal and surrounding mandals. Cover drying crops with tarpaulins immediately.',
    humidity_lbl: 'Humidity:',
    rain_chance_lbl: 'Rain Probability:',
    drying_index_lbl: 'Drying Yard Suitability Index:',
    forecast_heading: '📅 5-Day Agricultural Weather Forecast',
    weather_rain_lbl: 'Rain:',

    // Farmer Portal: Tab 9 (KYC)
    kyc_heading: '📑 Verified Farmer Credentials & Real-Time KYC',
    kyc_subheading: 'Upload Aadhaar, Dharani passbook, Bank IFSC, PAN, and electricity bills to unlock instant 100% escrow locks from commercial buyers.',
    kyc_progress_title: 'Farmer Profile Verification Progress',
    kyc_btn_refresh: '🔄 Refresh Status',
    kyc_status_verified: '✓ Verified',
    kyc_status_pending: '⏳ Upload Document',
    kyc_badge_100: '100% Kissan Gold Farmer Verified',
    kyc_badge_partial: 'Intermediate Verification',

    // Buyer Portal Navigation & Sections
    buyer_title: '🏢 Commercial Buyer Portal',
    buyer_tab_lots: 'Farm Harvest Lots',
    buyer_tab_lots_sub: 'Live Harvest Marketplace',
    buyer_tab_bids: 'My Bids & Negotiations',
    buyer_tab_bids_sub: 'Active Bids & Counters',
    buyer_tab_orders: 'Procurement Orders & Logistics',
    buyer_tab_orders_sub: 'Truck Dispatch & Escrow Release',
    buyer_tab_rfq: 'Post Purchase Demands (RFQ)',
    buyer_tab_rfq_sub: 'Bulk Procurement Tenders',
    buyer_tab_arbitrage: 'Market Intelligence & Savings',
    buyer_tab_arbitrage_sub: 'Mandi vs Direct Trade Arbitrage',
    buyer_escrow_title: '🛡️ Escrow Account Balance',
    buyer_escrow_note: 'Funds release from your escrow only after digital farm-gate weighment and OTP verification.',
    btn_add_funds: '+ Add Escrow Funds',
    buyer_lots_banner: 'Verified Farm Harvest Lots Ready for Procurement',
    buyer_lots_desc: 'Procure high-quality paddy, chilli, and cotton directly from verified Telangana farmers with statutory fee exemptions and 0% commission.',
    buyer_search_placeholder: 'Search by crop, mandal, or lot ID...',
    btn_place_bid: '⚡ Place Real Bid',
    btn_assign_truck: '🚛 Assign Vehicle & Driver',
    btn_post_rfq: '📝 Post Purchase Tender',
    btn_calc_arbitrage: '📊 Calculate Arbitrage Savings',
    buyer_bids_banner: 'Active Bids & Real-Time Negotiations',
    buyer_bids_desc: 'Track your incoming bids on farmer harvest lots. Immediately raise bids if outbid, or accept farmer counteroffers.',
    buyer_orders_banner: 'Procurement Pipeline & Logistics Tracker',
    buyer_orders_desc: 'Assign your transport vehicles for accepted deals. Enter farmer verification OTP upon farm-gate weighment to release escrow payments.',
    buyer_rfq_banner: 'Post Bulk Procurement Requirement (RFQ)',
    buyer_rfq_desc: 'Post large-scale commodity demands for your processing mill. 100+ Telangana FPOs respond directly with guaranteed quality.',
    buyer_arbitrage_banner: 'Market Intelligence & Direct Trade Arbitrage',
    buyer_arbitrage_desc: 'Comparative breakdown of savings achieved by bypassing middleman commissions, extra freight handling, and APMC cess.',
    buyer_lot_loading: 'Loading live farmer harvest lots...',
    buyer_lot_empty: 'No harvest lots currently available for procurement',
    buyer_bids_empty: 'You have not placed bids on any harvest lots yet',
    buyer_orders_empty: 'No active procurement orders found',
    buyer_qty_lbl: 'Quantity:',
    buyer_moisture_lbl: 'Moisture Level:',
    buyer_location_lbl: 'Farm Location:',
    buyer_farmer_lbl: 'Farmer Name:',
    buyer_reserve_lbl: 'Farmer Reserve Price:',
    buyer_highest_lbl: 'Current Highest Bid:',
    buyer_leading_status: '🟢 Winning Bid',
    buyer_outbid_status: '🔴 Outbid by Competitor',
    buyer_awaiting_farmer: 'Awaiting farmer acceptance',
    buyer_raise_bid_btn: 'Raise Bid Now',
    buyer_assigned_truck_lbl: 'Assigned Truck:',
    buyer_driver_details_lbl: 'Driver Details:',
    buyer_btn_assign_truck: '🚛 Assign Truck',
    buyer_btn_enter_otp: '🔑 Enter OTP',
    buyer_btn_view_invoice: '📄 View Invoice',

    // Logistics Portal Navigation & Sections
    logistics_title: '🚛 Logistics Fleet Portal',
    logistics_trips_title: 'Rural Agricultural Haulage Trips Board',
    logistics_trips_desc: 'Accept produce haulage trips from rural villages to mandis and warehouses with upfront rates and guaranteed loading payments.',
    btn_refresh_trips: '🔄 Refresh Trips',
    filter_all_trips: 'All Trips',
    filter_available_trips: '⚡ Available',
    filter_assigned_trips: '🚛 Assigned',
    filter_delivered_trips: '✅ Delivered',
    btn_accept_trip: '✓ Accept Trip',
    btn_cancel: 'Cancel',
    trip_origin_lbl: '📍 Origin / Pickup:',
    trip_dest_lbl: '🏁 Destination / Delivery:',
    trip_dist_lbl: 'Estimated Distance:',
    trip_vehicle_lbl: 'Vehicle Type:',
    trip_freight_lbl: 'Guaranteed Freight:',
    trip_assigned_lbl: '🚛 Assigned Vehicle:',
    trip_driver_lbl: 'Driver:',
    trip_status_available: 'Available for Haulage',
    trip_status_in_transit: 'In Transit',
    trip_status_delivered: 'Delivered',
    btn_take_trip: '✓ Accept Trip',
    btn_verify_otp: '🔑 Verify Pickup OTP',
    payout_released: '✓ Freight Payout Released',
    lbl_vehicle_reg: 'Vehicle Registration Number *',
    lbl_driver_name: 'Driver Name *',
    lbl_driver_mobile: 'Driver Mobile Number *',

    // Modals
    auth_phone_title: 'Farmer Mobile Login',
    auth_phone_sub: 'Enter your 10-digit mobile number. An instant verification OTP will be sent.',
    btn_send_otp: 'Send Verification OTP →',
    auth_otp_title: 'Enter 6-Digit OTP',
    otp_sent_to: 'Verification code sent to:',
    btn_verify_enter: 'Verify & Enter Dashboard →',
    counter_title: 'Counter Offer to Buyer',
    accept_trip_title: 'Accept Transport Haulage Trip',
    assign_truck_title: 'Assign Truck & Driver',
    place_bid_modal_title: 'Place Bid on Farm Lot',
    bid_rate_label: 'Your Bid Price (Per Quintal) *',
    bid_logistics_mode: 'Logistics Arrangement:',
    opt_buyer_vehicle: '🚛 Buyer provides own vehicle (₹0 farmer cost)',
    opt_platform_vehicle: '🚚 Request platform transport fleet',
    total_deal_valuation: 'Total Deal Valuation:',
    btn_confirm_bid: '🚀 Submit Bid',

    // Buyer RFQ & Arbitrage
    lbl_rfq_crop: 'Crop Required *',
    lbl_rfq_qty: 'Total Quantity Required (Quintals) *',
    lbl_rfq_price: 'Max Target Purchase Price (₹/Quintal) *',
    lbl_rfq_location: 'Delivery / Collection Hub *',
    lbl_rfq_validity: 'Tender Validity Duration *',
    btn_publish_rfq: '📢 Publish Bulk Tender (RFQ)',
    rfq_active_title: '📋 Active Tenders by Your Firm',
    lbl_truck_eta: 'Estimated Time of Arrival at Farm *',
    btn_dispatch_truck: '🚛 Dispatch Truck →',
    calc_savings_header: '💰 Calculate Your Annual Procurement Savings',
    calc_savings_desc: 'Kissan Connect completely eliminates middleman commissions (4-6%), loading wastage (2%), and excessive APMC handling fees.',
    lbl_select_crop: 'Select Crop:',
    lbl_purchase_qty: 'Your Purchase Volume (in Quintals):',
    lbl_net_savings_card: 'Net Savings Realized on this Deal:',
    lbl_savings_percent_tag: '9.2% Savings compared to traditional Mandi costs',
    lbl_commission_saved: 'Eliminated Middleman Commission (5%):',
    lbl_transparency_guarantee: 'Direct Farm-Gate Weighment Protection:',
    lbl_time_saved: 'Time Saved:',
    lbl_hours_24: '24 Hours',
    lbl_transparency_100: '100% Transparency',
    btn_close: 'Close',
    btn_print_pdf: '🖨️ Print / Save PDF',
    inv_title: 'APMC Direct Farm-Gate Procurement Invoice',
    inv_date_lbl: 'Date:',
    inv_commodity_col: 'Commodity Description',
    inv_qty_col: 'Quantity',
    inv_rate_col: 'Rate / Quintal',
    inv_total_col: 'Total',
    inv_subtotal: 'Gross Commodity Value:',
    inv_apmc_cess: 'Telangana APMC Cess (₹0 - Direct Farm Exemption):',
    inv_net_payout: 'Net Payment Released to Farmer via Escrow:',
    inv_footer_note: 'This digital invoice was settled under the Telangana Agri Produce Act upon farm-gate OTP verification.',

    // Farmer Portal Modals & Actions
    counter_price_lbl: 'Your Counter Price (per Quintal) *',
    counter_unit_symbol: '/ Quintal',
    counter_vehicle_req: 'Buyer must arrange transport vehicle directly to farm gate',
    btn_submit_counter: 'Send Counter Offer →',
    doc_preview_title: '📄 Document Preview',
    doc_preview_sub: 'Inspection of uploaded authentic document',
    btn_download_preview_doc: '📥 Download Document',
    confirm_deal_title: 'Confirm Deal & Lock Escrow',
    confirm_deal_sub: 'Finalizing procurement agreement with buyer',
    deal_buyer_lbl: 'Buyer Merchant:',
    deal_crop_qty_lbl: 'Crop & Quantity:',
    deal_price_lbl: 'Agreed Price:',
    deal_logistics_lbl: 'Logistics Terms:',
    deal_total_escrow_lbl: 'Total Escrow Amount:',
    deal_escrow_notice: '🛡️ Escrow Security: Upon acceptance, this amount is locked in bank escrow. Your crop and funds remain 100% secure until farm-gate loading is complete and OTP is verified.',
    btn_confirm_deal: '✓ Confirm Deal & Lock Escrow',
    farm_gate_otp_title: 'Farm-Gate Loading Verification',
    farm_gate_otp_sub: 'Enter the 4-digit code provided by the driver or buyer representative to release escrow funds immediately.',
    farm_gate_otp_warning: '⚠️ Important Notice: Verify weight and verify loading onto the truck before releasing the code.',
    farm_gate_otp_lbl: '4-Digit Farm-Gate OTP:',
    btn_verify_release_funds: '🔓 Verify & Release Payment →',
    receipt_brand: '🌾 Kissan Connect',
    receipt_gov_sub: 'Telangana Agricultural Market Platform • Digital Escrow Payment Receipt',
    receipt_order_id_lbl: 'Receipt / Order ID:',
    receipt_utr_lbl: 'Banking UTR Reference:',
    receipt_farmer_lbl: 'Beneficiary Farmer:',
    receipt_farmer_name: 'Malla Reddy',
    receipt_buyer_lbl: 'Buyer Merchant:',
    receipt_bank_lbl: 'Credited Bank Account:',
    receipt_bank_val: 'SBI (SBIN0020194) - Jangaon',
    receipt_mode_lbl: 'Payment Mode:',
    receipt_mode_val: 'Instant Escrow IMPS/RTGS (Free - ₹0 Fee)',
    receipt_col_desc: 'Crop Description',
    receipt_col_qty: 'Quantity',
    receipt_col_rate: 'Rate / Quintal',
    receipt_col_amount: 'Amount',
    receipt_crop_name: 'Teja Chilli',
    receipt_crop_variety: 'Export Grade A • 9.2% Moisture',
    receipt_apmc_cess: 'APMC Market Cess (0%)',
    receipt_escrow_fee: 'Escrow Platform Fee (Free - ₹0)',
    receipt_net_farmer_total: 'Net Amount Credited to Farmer:',
    receipt_footer_note: 'This receipt is digitally signed via Kissan Connect Smart Escrow. No physical signature required.',
    btn_print_receipt: '🖨️ Print Receipt / Save PDF',
    api_settings_title: '⚙️ Custom API Keys & Geolocation Settings',
    api_settings_sub: 'Kissan Connect uses free, keyless live services by default. You can enter your private API keys here if desired.',
    api_weather_lbl: 'OpenWeatherMap API Key (Optional)',
    api_weather_hint: 'Leave blank to use default high-accuracy live weather service.',
    api_maps_lbl: 'Google Maps Geocoding API Key (Optional)',
    api_maps_hint: 'Leave blank to use default reverse geocoding.',
    btn_save_api_settings: '💾 Save Settings'
  }
};

function sanitizeForLang(text, lang) {
  if (!text || typeof text !== 'string') return text || '';
  const current = lang || (typeof window !== 'undefined' && window.currentLang) || 'te';

  if (current === 'en') {
    // Extract English text inside parenthesis e.g. "మల్లారెడ్డి (Malla Reddy)" -> "Malla Reddy"
    const match = text.match(/\(([^)]+)\)/);
    if (match && /[a-zA-Z]/.test(match[1])) {
      return match[1].trim();
    }
    // Remove Telugu characters & residual brackets
    if (/[\u0C00-\u0C7F]/.test(text)) {
      let cleaned = text.replace(/[\u0C00-\u0C7F]/g, '').replace(/[()]/g, '').trim();
      if (cleaned.length > 0) return cleaned;

      const knownEnMap = {
        'తేజ మిర్చి': 'Teja Red Chilli',
        'వరి': 'Paddy',
        'పత్తి': 'Raw Cotton',
        'పసుపు': 'Turmeric',
        'మొక్కజొన్న': 'Maize',
        'కందులు': 'Red Gram',
        'జనగామ': 'Jangaon',
        'వరంగల్': 'Warangal',
        'మిర్యాలగూడ': 'Miryalaguda',
        'ఖమ్మం': 'Khammam',
        'నిజామాబాద్': 'Nizamabad',
        'సికింద్రాబాద్': 'Secunderabad',
        'మల్లారెడ్డి': 'Malla Reddy'
      };
      for (const [teKey, enVal] of Object.entries(knownEnMap)) {
        if (text.includes(teKey)) return text.replace(teKey, enVal).replace(/[\u0C00-\u0C7F]/g, '').trim();
      }
      return 'Agricultural Produce';
    }
    return text;
  } else if (current === 'te') {
    // Extract Telugu part before parenthesis e.g. "మల్లారెడ్డి (Malla Reddy)" -> "మల్లారెడ్డి"
    if (text.includes('(') && /[\u0C00-\u0C7F]/.test(text)) {
      const parts = text.split('(');
      if (parts[0] && /[\u0C00-\u0C7F]/.test(parts[0])) {
        return parts[0].trim();
      }
    }
    return text;
  }
  return text;
}

// 5. MASTER LANGUAGE SWITCHER
function setLanguage(lang, shouldBroadcast = true) {
  if (lang !== 'te' && lang !== 'en') return;
  currentLang = lang;
  if (typeof window !== 'undefined') {
    window.currentLang = lang;
  }

  // Save to persistent storage
  try {
    localStorage.setItem('kissan_lang', lang);
    localStorage.setItem('kissan_preferred_language', lang);
  } catch (e) {}

  // Broadcast to other tabs if requested
  if (shouldBroadcast && langChannel) {
    try {
      langChannel.postMessage({ lang: lang });
    } catch (e) {}
  }

  // Update HTML lang attribute and body class
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    if (lang === 'en') {
      document.body.classList.add('lang-en');
    } else {
      document.body.classList.remove('lang-en');
    }

    // Update document title dynamically based on portal
    const path = window.location.pathname;
    if (path.includes('farmer_portal')) {
      document.title = TRANSLATIONS[lang].page_title_farmer;
    } else if (path.includes('buyer_portal')) {
      document.title = TRANSLATIONS[lang].page_title_buyer;
    } else if (path.includes('logistics_portal')) {
      document.title = TRANSLATIONS[lang].page_title_logistics;
    } else {
      document.title = TRANSLATIONS[lang].page_title_main;
    }

    // Update Language Toggle Buttons across all portals
    const btnEn = document.getElementById('btnLangEn');
    const btnTe = document.getElementById('btnLangTe');
    if (btnEn) {
      if (lang === 'en') btnEn.classList.add('active');
      else btnEn.classList.remove('active');
    }
    if (btnTe) {
      if (lang === 'te') btnTe.classList.add('active');
      else btnTe.classList.remove('active');
    }

    // Translate all elements with [data-i18n]
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
        el.textContent = TRANSLATIONS[lang][key];
      }
    });

    // Translate rich HTML elements with [data-i18n-html]
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
        el.innerHTML = TRANSLATIONS[lang][key];
      }
    });

    // Translate placeholders with [data-i18n-placeholder]
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
        el.setAttribute('placeholder', TRANSLATIONS[lang][key]);
      }
    });

    // Translate title tooltips with [data-i18n-title]
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
        el.setAttribute('title', TRANSLATIONS[lang][key]);
      }
    });

    // Sync Farmer Profile Pill Text if elements exist
    const topCleanFarmerName = document.getElementById('topCleanFarmerName');
    if (topCleanFarmerName) {
      topCleanFarmerName.textContent = lang === 'en' ? 'Malla Reddy' : 'మల్లారెడ్డి';
    }
    const displayFarmerName = document.getElementById('displayFarmerName');
    if (displayFarmerName) {
      displayFarmerName.textContent = lang === 'en' ? 'Malla Reddy' : 'మల్లారెడ్డి';
    }
    const topLocationCleanText = document.getElementById('topLocationCleanText');
    if (topLocationCleanText && (topLocationCleanText.textContent.includes('జనగామ') || topLocationCleanText.textContent.includes('Jangaon'))) {
      topLocationCleanText.textContent = lang === 'en' ? 'Jangaon, Warangal' : 'జనగామ, వరంగల్';
    }
  }

  // Update active breadcrumbs and tab indicators
  if (typeof updateTabBreadcrumb === 'function') updateTabBreadcrumb();

  // Re-render portal-specific dynamic components
  try {
    if (typeof renderMandiTicker === 'function') renderMandiTicker();
    if (typeof renderBiddingArena === 'function') renderBiddingArena();
    if (typeof updateHoldSellAdvice === 'function') updateHoldSellAdvice();
    if (typeof renderOrdersEscrow === 'function') renderOrdersEscrow();
    if (typeof renderMandiSnapshot === 'function') renderMandiSnapshot();
    if (typeof updateMarketCharts === 'function') updateMarketCharts();
    if (typeof calculateDemandAsk === 'function') calculateDemandAsk();
    if (typeof updateWeatherDistrictUI === 'function') updateWeatherDistrictUI();
    if (typeof renderKycDocumentsStatus === 'function') renderKycDocumentsStatus();

    // Buyer portal re-renders
    if (typeof renderBuyerLots === 'function') renderBuyerLots();
    if (typeof renderMyBids === 'function') renderMyBids();
    if (typeof renderProcurementOrders === 'function') renderProcurementOrders();
    if (typeof renderBuyerRfqs === 'function') renderBuyerRfqs();
    if (typeof recalculateArbitrage === 'function') recalculateArbitrage();

    // Logistics portal re-renders
    if (typeof renderLogisticsTrips === 'function') renderLogisticsTrips();
    if (typeof updateLogisticsEarningsUI === 'function') updateLogisticsEarningsUI();
  } catch (e) {
    console.warn('Language re-render notification caught:', e);
  }
}

// 6. Auto-initialize on load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setLanguage(getStoredLang(), false);
    });
  } else {
    setLanguage(getStoredLang(), false);
  }
}

// 7. Global Exports
if (typeof window !== 'undefined') {
  window.TRANSLATIONS = TRANSLATIONS;
  window.setLanguage = setLanguage;
  window.currentLang = currentLang;
  window.t = function(key) {
    return key;
};
  window.sanitizeForLang = sanitizeForLang;
}
