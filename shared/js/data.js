/**
 * KISSAN CONNECT (కిసాన్ కనెక్ట్) - TELANGANA DATA & LOCALIZATION ENGINE
 */

var TELANGANA_MANDIS = [
  { id: 'wgl_enumamula', nameTe: 'వరంగల్ (ఎనుమాముల)', nameEn: 'Warangal (Enumamula)', crop: 'తేజ మిర్చి (Teja Chilli)', price: 21400, trend: 'up', change: '+3.2%' },
  { id: 'khammam', nameTe: 'ఖమ్మం మార్కెట్', nameEn: 'Khammam Mandi Yard', crop: 'తేజ మిర్చి & మొక్కజొన్న', price: 21850, trend: 'up', change: '+4.1%' },
  { id: 'nizamabad', nameTe: 'నిజామాబాద్ మార్కెట్', nameEn: 'Nizamabad APMC', crop: 'పసుపు (Turmeric)', price: 14900, trend: 'up', change: '+1.8%' },
  { id: 'miryalaguda', nameTe: 'మిర్యాలగూడ యార్డ్', nameEn: 'Miryalaguda Hub', crop: 'తెలంగాణ సోనా వరి (Paddy)', price: 2380, trend: 'up', change: '+2.4%' },
  { id: 'suryapet', nameTe: 'సూర్యాపేట మార్కెట్', nameEn: 'Suryapet Yard', crop: 'కందులు (Red Gram)', price: 10450, trend: 'down', change: '-0.8%' },
  { id: 'adilabad', nameTe: 'ఆదిలాబాద్ కాటన్ మార్కెట్', nameEn: 'Adilabad Cotton Yard', crop: 'పత్తి (Raw Cotton)', price: 7450, trend: 'up', change: '+1.5%' },
];

var CROPS_CONFIG = {
  teja_chilli: {
    nameTe: 'తేజ మిర్చి (Teja Red Chilli)',
    nameEn: 'Teja Red Chilli',
    image: 'assets/crops/teja_chilli.jpg',
    defaultVarietyTe: 'తేజ స్పెషల్ ఎగుమతి గ్రేడ్',
    defaultVarietyEn: 'Teja Special Export Grade',
    demandStatusTe: 'చాలా ఎక్కువ (High Demand - ఎగుమతి ఆర్డర్లు)',
    demandStatusEn: 'Very High (Export Order Rush)',
    demandTag: 'high',
    suggestedRange: '₹20,800 – ₹22,500',
    suggestedMin: 20800,
    suggestedMax: 22500,
    reasonTe: 'ఖమ్మం మరియు వరంగల్ మార్కెట్లలో ఎగుమతి సంస్థల నుండి భారీ డిమాండ్ ఉంది. రాకలు 15% తగ్గాయి.',
    reasonEn: 'Massive exporter demand in Khammam & Warangal mandis. Daily arrivals fell by 15%.',
    unit: 'Quintal'
  },
  paddy: {
    nameTe: 'తెలంగాణ సోనా వరి (Telangana Sona Paddy / BPT)',
    nameEn: 'Telangana Sona Paddy (BPT)',
    image: 'assets/crops/paddy.jpg',
    defaultVarietyTe: 'తెలంగాణ సోనా (RNR 15048)',
    defaultVarietyEn: 'Telangana Sona (RNR 15048)',
    demandStatusTe: 'స్థిరమైన డిమాండ్ (Steady High)',
    demandStatusEn: 'Steady High Demand',
    demandTag: 'high',
    suggestedRange: '₹2,350 – ₹2,480',
    suggestedMin: 2350,
    suggestedMax: 2480,
    reasonTe: 'మిర్యాలగూడ రైస్ మిల్లులు ప్రీమియం సోనా బియ్యం కోసం కనీస మద్దతు ధర కంటే ఎక్కువ ఆఫర్ చేస్తున్నాయి.',
    reasonEn: 'Miryalaguda rice mills offering premium above MSP for low-glycemic Telangana Sona.',
    unit: 'Quintal'
  },
  cotton: {
    nameTe: 'పత్తి (Raw White Cotton)',
    nameEn: 'Raw White Cotton',
    image: 'assets/crops/cotton.jpg',
    defaultVarietyTe: 'బ్రహ్మ / కావేరి పొడవు పింజ',
    defaultVarietyEn: 'Long Staple Brahma/Kaveri',
    demandStatusTe: 'సాధారణం (Moderate)',
    demandStatusEn: 'Moderate Demand',
    demandTag: 'normal',
    suggestedRange: '₹7,300 – ₹7,650',
    suggestedMin: 7300,
    suggestedMax: 7650,
    reasonTe: 'ఆదిలాబాద్ జిన్నింగ్ మిల్లులు తేమ 8% లోపు ఉన్న పత్తికి మాత్రమే ప్రీమియం చెల్లిస్తున్నాయి.',
    reasonEn: 'Ginning mills paying premium strictly for moisture < 8%.',
    unit: 'Quintal'
  },
  turmeric: {
    nameTe: 'నిజామాబాద్ పసుపు (Raw Turmeric)',
    nameEn: 'Nizamabad Turmeric',
    image: 'assets/crops/turmeric.jpg',
    defaultVarietyTe: 'నిజామాబాద్ ఫింగర్ స్పెషల్',
    defaultVarietyEn: 'Nizamabad Finger Special',
    demandStatusTe: 'పెరుగుతున్న డిమాండ్ (Rising)',
    demandStatusEn: 'Rising Demand',
    demandTag: 'high',
    suggestedRange: '₹14,500 – ₹15,600',
    suggestedMin: 14500,
    suggestedMax: 15600,
    reasonTe: 'మసాలా కంపెనీల నుండి కర్క్యుమిన్ 3.5%+ ఉన్న పసుపుకు ప్రత్యేక ఆర్డర్లు ఉన్నాయి.',
    reasonEn: 'Spice corporations placing special orders for curcumin > 3.5%.',
    unit: 'Quintal'
  },
  red_gram: {
    nameTe: 'ఎర్ర కందులు (Red Gram / Kandulu)',
    nameEn: 'Red Gram (Kandulu)',
    image: 'assets/crops/paddy.jpg',
    defaultVarietyTe: 'ఆశా / మారుతి కందులు',
    defaultVarietyEn: 'Asha / Maruti Red Gram',
    demandStatusTe: 'సాధారణం (Normal)',
    demandStatusEn: 'Normal Demand',
    demandTag: 'normal',
    suggestedRange: '₹10,200 – ₹10,800',
    suggestedMin: 10200,
    suggestedMax: 10800,
    reasonTe: 'దాల్ మిల్లుల వద్ద తగినంత నిల్వలు ఉన్నాయి. సాధారణ గ్రేడ్ ధరలు స్థిరంగా ఉన్నాయి.',
    reasonEn: 'Dal mills well-stocked; prices stable.',
    unit: 'Quintal'
  },
  maize: {
    nameTe: 'మొక్కజొన్న (Yellow Maize)',
    nameEn: 'Yellow Maize',
    image: 'assets/crops/teja_chilli.jpg',
    defaultVarietyTe: 'పౌల్ట్రీ ఫీడ్ స్పెషల్ గ్రేడ్',
    defaultVarietyEn: 'Poultry Feed Special Grade',
    demandStatusTe: 'ఎక్కువ (High)',
    demandStatusEn: 'High Demand',
    demandTag: 'high',
    suggestedRange: '₹2,150 – ₹2,280',
    suggestedMin: 2150,
    suggestedMax: 2280,
    reasonTe: 'హైదరాబాద్ చుట్టుపక్కల పౌల్ట్రీ పరిశ్రమల నుండి అధిక కొనుగోళ్లు జరుగుతున్నాయి.',
    reasonEn: 'Heavy buying from Hyderabad poultry feed sector.',
    unit: 'Quintal'
  }
};

// Initial Farmer Lots with active incoming bids
var INITIAL_FARMER_LOTS = [
  {
    id: 'LOT-TS-401',
    cropKey: 'teja_chilli',
    cropNameTe: 'తేజ మిర్చి (Teja Red Chilli)',
    cropNameEn: 'Teja Red Chilli',
    varietyTe: 'తేజ స్పెషల్ ఎగుమతి రకం',
    varietyEn: 'Teja Special Export Grade',
    quantity: 40,
    grade: 'A',
    moisture: '9.2%',
    locationTe: 'జనగామ మండలం, వరంగల్ జిల్లా',
    locationEn: 'Jangaon Mandal, Warangal Dist',
    storageTe: 'పొలంలోనే ఉంది (Farm Gate)',
    storageEn: 'Farm Gate Pickup',
    reservePrice: 21000,
    highestBid: 21650,
    auctionEndsIn: '03h : 42m : 18s',
    image: 'assets/crops/teja_chilli.jpg',
    bids: [
      {
        bidId: 'BID-901',
        buyerName: 'ITC Agri Business Hub',
        buyerRating: '4.9 ★ (84 డీల్స్)',
        buyerLocation: 'సికింద్రాబాద్ (Secunderabad)',
        pricePerQ: 21650,
        logisticsMode: 'buyer_vehicle', // Buyer brings their own truck!
        logisticsTextTe: '🚛 కొనుగోలుదారుడే సొంత లారీ పంపుతారు (రైతుకు ఖర్చు ₹0)',
        logisticsTextEn: '🚛 Buyer will send their own truck (₹0 farmer cost)',
        status: 'active'
      },
      {
        bidId: 'BID-902',
        buyerName: 'ఖమ్మం స్పైసెస్ ఎక్స్‌పోర్టర్స్',
        buyerRating: '4.7 ★ (41 డీల్స్)',
        buyerLocation: 'ఖమ్మం (Khammam)',
        pricePerQ: 21400,
        logisticsMode: 'buyer_vehicle',
        logisticsTextTe: '🚛 కొనుగోలుదారుడే సొంత లారీ పంపుతారు (రైతుకు ఖర్చు ₹0)',
        logisticsTextEn: '🚛 Buyer will send own vehicle (₹0 farmer cost)',
        status: 'active'
      },
      {
        bidId: 'BID-903',
        buyerName: 'వరంగల్ ట్రేడింగ్ కార్పొరేషన్',
        buyerRating: '4.5 ★ (19 డీల్స్)',
        buyerLocation: 'వరంగల్ (Enumamula)',
        pricePerQ: 21200,
        logisticsMode: 'platform_transport',
        logisticsTextTe: '🚚 ప్లాట్‌ఫామ్ రవాణాదారుడు కావాలి',
        logisticsTextEn: '🚚 Platform transporter required',
        status: 'active'
      }
    ]
  },
  {
    id: 'LOT-TS-402',
    cropKey: 'paddy',
    cropNameTe: 'తెలంగాణ సోనా వరి (Telangana Sona Paddy)',
    cropNameEn: 'Telangana Sona Paddy (RNR)',
    varietyTe: 'RNR 15048 సూపర్ ఫైన్',
    varietyEn: 'RNR 15048 Super Fine Grain',
    quantity: 120,
    grade: 'A',
    moisture: '13.5%',
    locationTe: 'మిర్యాలగూడ పరిసరాలు, నల్గొండ జిల్లా',
    locationEn: 'Miryalaguda, Nalgonda Dist',
    storageTe: 'ఇంటి గోదాము (Village Shed)',
    storageEn: 'Village Shed',
    reservePrice: 2320,
    highestBid: 2440,
    auctionEndsIn: '08h : 15m : 00s',
    image: 'assets/crops/paddy.jpg',
    bids: [
      {
        bidId: 'BID-881',
        buyerName: 'శ్రీ కృష్ణ మోడ్రన్ రైస్ మిల్స్',
        buyerRating: '4.9 ★ (120 డీల్స్)',
        buyerLocation: 'మిర్యాలగూడ (Miryalaguda)',
        pricePerQ: 2440,
        logisticsMode: 'buyer_vehicle',
        logisticsTextTe: '🚛 కొనుగోలుదారుడే సొంత లారీ పంపుతారు (రైతుకు ఖర్చు ₹0)',
        logisticsTextEn: '🚛 Buyer arranges own truck (₹0 farmer cost)',
        status: 'active'
      },
      {
        bidId: 'BID-882',
        buyerName: 'తెలంగాణ ఫుడ్ కార్పొరేషన్ సప్లయర్స్',
        buyerRating: '4.8 ★ (58 డీల్స్)',
        buyerLocation: 'హైదరాబాద్ (Bowenpally)',
        pricePerQ: 2410,
        logisticsMode: 'platform_transport',
        logisticsTextTe: '🚚 ప్లాట్‌ఫామ్ రవాణాదారుడు కావాలి',
        logisticsTextEn: '🚚 Platform transporter required',
        status: 'active'
      }
    ]
  }
];

// Active Orders in Escrow Tracker
var ACTIVE_ORDERS = [
  {
    orderId: 'KC-TS-2026-091',
    lotId: 'LOT-TS-401',
    cropNameTe: 'తేజ మిర్చి (40 క్వింటాళ్లు)',
    cropNameEn: 'Teja Red Chilli (40 Quintals)',
    buyerName: 'ITC Agri Business Hub',
    buyerPhone: '+91 94401 22891',
    agreedRate: 21650,
    totalEscrowAmount: 866000,
    currentStep: 3, // 1: Accepted, 2: Escrow Locked, 3: Truck Dispatched, 4: OTP Verification, 5: Paid
    farmGateOtp: '4928',
    vehicleNumber: 'TS 03 UB 8192 (10-Ton Truck)',
    driverName: 'రాము యాదవ్ (Ramu Yadav)',
    estimatedArrival: 'ఈరోజు సాయంత్రం 4:30 గంటలకు'
  }
];

// Hold or Sell Advice Data for Telangana
var HOLD_SELL_DATA = {
  paddy: {
    cropTe: 'తెలంగాణ సోనా వరి',
    cropEn: 'Telangana Sona Paddy',
    currentMandiPrice: 2380,
    projected15DayPrice: 2580,
    tswcRentPerQ: 18, // Storage cost per quintal for 15 days
    recommendation: 'hold', // 'hold' or 'sell'
    verdictTe: '🌾 సిఫారసు: 15 రోజులు నిల్వ చేయండి (HOLD)',
    verdictEn: '🌾 Recommendation: HOLD for 15 Days',
    explanationTe: 'మరో 10 రోజుల్లో మిర్యాలగూడ మార్కెట్లలో వరి రాకలు 30% తగ్గుతాయి. సమీప ప్రభుత్వ గోదాములో నిల్వ చేయడం వల్ల నిల్వ ఖర్చు (₹18) పోను మీకు క్వింటాలుకు ₹182 అదనపు నికర లాభం వస్తుంది.',
    explanationEn: 'Daily paddy arrivals will decline by 30% in Miryalaguda mandis. Holding in nearby TSWC warehouse will yield +₹182 net gain per quintal after deducting storage charges (₹18).',
    netGainPerQ: 182,
    nearbyTSWC: [
      { name: 'వరంగల్ TSWC వేర్‌హౌస్ యూనిట్-2', dist: '12 కి.మీ', capacity: '42% ఖాళీగా ఉంది', rate: '₹6.50/బస్తా/నెలకు' },
      { name: 'జనగామ వ్యవసాయ మార్కెట్ గోదాము', dist: '6 కి.మీ', capacity: '28% ఖాళీగా ఉంది', rate: '₹5.00/బస్తా/నెలకు' },
      { name: 'మిర్యాలగూడ సెంట్రల్ సైలోస్', dist: '24 కి.మీ', capacity: '60% ఖాళీగా ఉంది', rate: '₹7.00/బస్తా/నెలకు' }
    ]
  },
  teja_chilli: {
    cropTe: 'తేజ మిర్చి',
    cropEn: 'Teja Chilli',
    currentMandiPrice: 21400,
    projected15DayPrice: 21600,
    tswcRentPerQ: 140, // Cold storage for chilli
    recommendation: 'sell',
    verdictTe: '⚡ సిఫారసు: ఇప్పుడే బిడ్డింగ్‌లో విక్రయించండి (SELL NOW)',
    verdictEn: '⚡ Recommendation: SELL NOW in Live Bidding',
    explanationTe: 'ప్రస్తుతం ఖమ్మంలో మిర్చి రేటు రికార్డు గరిష్ట స్థాయిలో ఉంది. కోల్డ్ స్టోరేజ్ చార్జీలు (₹140/క్వింటాల్) లెక్కించిన తర్వాత నిల్వ చేయడం వల్ల ఎక్కువ ప్రయోజనం లేదు. ప్రస్తుత బిడ్డింగ్ వార్‌లోనే అమ్మడం లాభదాయకం.',
    explanationEn: 'Chilli prices are currently near seasonal peaks. After cold storage fees (₹140/Q), holding offers negligible upside. Capitalize on active buyer bidding war right now.',
    netGainPerQ: 60,
    nearbyTSWC: [
      { name: 'ఖమ్మం స్పైసెస్ కోల్డ్ స్టోరేజ్', dist: '18 కి.మీ', capacity: '15% ఖాళీగా ఉంది', rate: '₹35/బస్తా/నెలకు' },
      { name: 'వరంగల్ ఎనుమాముల మార్కెట్ కోల్డ్ హబ్', dist: '14 కి.మీ', capacity: '22% ఖాళీగా ఉంది', rate: '₹32/బస్తా/నెలకు' }
    ]
  },
  cotton: {
    cropTe: 'పత్తి (Cotton)',
    cropEn: 'Cotton',
    currentMandiPrice: 7450,
    projected15DayPrice: 7800,
    tswcRentPerQ: 25,
    recommendation: 'hold',
    verdictTe: '🌾 సిఫారసు: 15-20 రోజులు నిల్వ చేయండి (HOLD)',
    verdictEn: '🌾 Recommendation: HOLD for 15-20 Days',
    explanationTe: 'అంతర్జాతీయ మార్కెట్లలో పత్తి ధరలు పెరుగుతున్నాయి. నిజామాబాద్ & ఆదిలాబాద్ మార్కెట్లలో రాబోయే వారాల్లో ధరలు పుంజుకునే అవకాశం ఉంది.',
    explanationEn: 'International cotton futures are trending upwards. Telangana ginning mills are expected to raise bids within 2-3 weeks.',
    netGainPerQ: 325,
    nearbyTSWC: [
      { name: 'ఆదిలాబాద్ స్టేట్ వేర్‌హౌస్', dist: '9 కి.మీ', capacity: '35% ఖాళీగా ఉంది', rate: '₹8/బస్తా/నెలకు' },
      { name: 'వరంగల్ కాటన్ కార్పొరేషన్ గోదాము', dist: '16 కి.మీ', capacity: '40% ఖాళీగా ఉంది', rate: '₹7.50/బస్తా/నెలకు' }
    ]
  },
  turmeric: {
    cropTe: 'పసుపు (Turmeric)',
    cropEn: 'Turmeric',
    currentMandiPrice: 14900,
    projected15DayPrice: 16200,
    tswcRentPerQ: 45,
    recommendation: 'hold',
    verdictTe: '🌾 సిఫారసు: గట్టిగా నిల్వ చేయండి (STRONG HOLD)',
    verdictEn: '🌾 Recommendation: STRONG HOLD',
    explanationTe: 'నిజామాబాద్ పసుపుకు ఈ సంవత్సరం పంట విస్తీర్ణం తగ్గడం వల్ల కొరత ఏర్పడుతోంది. 15 రోజుల్లో క్వింటాలుకు ₹1,250 పైగా పెరిగే అవకాశం ఉంది.',
    explanationEn: 'Turmeric sowing acreage is lower this year causing supply shortages in Nizamabad. Prices projected to surge by +₹1,250/Q.',
    netGainPerQ: 1255,
    nearbyTSWC: [
      { name: 'నిజామాబాద్ అగ్రికల్చర్ మార్కెట్ గోదాము', dist: '5 కి.మీ', capacity: '18% ఖాళీగా ఉంది', rate: '₹12/బస్తా/నెలకు' },
      { name: 'ఆర్మూర్ రూరల్ వేర్‌హౌస్', dist: '22 కి.మీ', capacity: '45% ఖాళీగా ఉంది', rate: '₹10/బస్తా/నెలకు' }
    ]
  }
};

// Market Trends & Historical Analytics Data for Chart.js
var MARKET_TRENDS_DATA = {
  teja_chilli: {
    nameTe: 'తేజ మిర్చి (ఖమ్మం & వరంగల్)',
    nameEn: 'Teja Red Chilli (Khammam & Warangal)',
    unitTe: '₹ / క్వింటాల్',
    unitEn: '₹ / Quintal',
    currentPrice: 21650,
    priceChange: '+12.4%',
    priceTrend: 'up',
    highPrice: 22400,
    highLocationTe: 'ఖమ్మం మార్కెట్ రికార్డ్',
    highLocationEn: 'Khammam Mandi Record',
    arrivals: '14,250 బస్తాలు/రోజు',
    arrivalsEn: '14,250 Bags/Day',
    arrivalsChangeTe: '▼ -18% (రాకలు తగ్గాయి - డిమాండ్ పెరిగింది)',
    arrivalsChangeEn: '▼ -18% (Arrivals down - High demand)',
    arrivalsTrend: 'down',
    actionAdviceTe: 'అధిక డిమాండ్ (Strong Ask)',
    actionAdviceEn: 'High Exporter Demand',
    actionSubTe: 'కనీసం ₹21,200 కంటే తక్కువగా అమ్మకండి',
    actionSubEn: 'Do not sell below ₹21,200 reserve',
    '15D': {
      labelsTe: ['సెప్టెం 1', '3', '5', '7', '9', '11', '13', '15'],
      labelsEn: ['Sep 1', 'Sep 3', 'Sep 5', 'Sep 7', 'Sep 9', 'Sep 11', 'Sep 13', 'Sep 15'],
      reserveAsk: [20400, 20500, 20700, 20900, 21000, 21200, 21400, 21500],
      actualBid: [20800, 21000, 21250, 21500, 21650, 21900, 22150, 22400],
      arrivals: [18200, 17500, 16900, 16100, 15400, 14900, 14500, 14250]
    },
    '30D': {
      labelsTe: ['ఆగస్టు 16', '20', '24', '28', 'సెప్టెం 1', '5', '10', '15'],
      labelsEn: ['Aug 16', 'Aug 20', 'Aug 24', 'Aug 28', 'Sep 1', 'Sep 5', 'Sep 10', 'Sep 15'],
      reserveAsk: [19800, 20000, 20200, 20400, 20500, 20800, 21200, 21500],
      actualBid: [20100, 20450, 20700, 20900, 21100, 21500, 21900, 22400],
      arrivals: [21500, 20800, 19600, 18500, 17200, 16000, 15100, 14250]
    },
    '90D': {
      labelsTe: ['జూన్ 15', 'జూన్ 30', 'జూలై 15', 'జూలై 31', 'ఆగస్టు 15', 'ఆగస్టు 31', 'సెప్టెం 15'],
      labelsEn: ['Jun 15', 'Jun 30', 'Jul 15', 'Jul 31', 'Aug 15', 'Aug 31', 'Sep 15'],
      reserveAsk: [18600, 18900, 19200, 19600, 20000, 20600, 21500],
      actualBid: [18900, 19300, 19700, 20200, 20800, 21500, 22400],
      arrivals: [26000, 24500, 22800, 20500, 18900, 16400, 14250]
    }
  },
  paddy: {
    nameTe: 'తెలంగాణ సోనా వరి (మిర్యాలగూడ & సూర్యాపేట)',
    nameEn: 'Telangana Sona Paddy (Miryalaguda & Suryapet)',
    unitTe: '₹ / క్వింటాల్',
    unitEn: '₹ / Quintal',
    currentPrice: 2420,
    priceChange: '+6.8%',
    priceTrend: 'up',
    highPrice: 2480,
    highLocationTe: 'మిర్యాలగూడ రైస్ మిల్స్ రికార్డ్',
    highLocationEn: 'Miryalaguda Mill Premium',
    arrivals: '32,400 బస్తాలు/రోజు',
    arrivalsEn: '32,400 Bags/Day',
    arrivalsChangeTe: '▼ -12% (సీజన్ ముగింపు దశ)',
    arrivalsChangeEn: '▼ -12% (Late season arrivals)',
    arrivalsTrend: 'down',
    actionAdviceTe: '15 రోజులు నిల్వ చేయండి (Hold)',
    actionAdviceEn: 'Hold for 15 Days (Profitable)',
    actionSubTe: 'గోదాము ఖర్చు పోను +₹182 నికర లాభం',
    actionSubEn: 'Net gain +₹182/Q after TSWC storage',
    '15D': {
      labelsTe: ['సెప్టెం 1', '3', '5', '7', '9', '11', '13', '15'],
      labelsEn: ['Sep 1', 'Sep 3', 'Sep 5', 'Sep 7', 'Sep 9', 'Sep 11', 'Sep 13', 'Sep 15'],
      reserveAsk: [2280, 2300, 2320, 2340, 2350, 2360, 2380, 2400],
      actualBid: [2320, 2340, 2365, 2380, 2400, 2420, 2450, 2480],
      arrivals: [38500, 37200, 36100, 35000, 34200, 33500, 32900, 32400]
    },
    '30D': {
      labelsTe: ['ఆగస్టు 16', '20', '24', '28', 'సెప్టెం 1', '5', '10', '15'],
      labelsEn: ['Aug 16', 'Aug 20', 'Aug 24', 'Aug 28', 'Sep 1', 'Sep 5', 'Sep 10', 'Sep 15'],
      reserveAsk: [2200, 2220, 2250, 2280, 2300, 2330, 2360, 2400],
      actualBid: [2240, 2260, 2300, 2320, 2350, 2380, 2420, 2480],
      arrivals: [44000, 42100, 40500, 38800, 37000, 35200, 33800, 32400]
    },
    '90D': {
      labelsTe: ['జూన్ 15', 'జూన్ 30', 'జూలై 15', 'జూలై 31', 'ఆగస్టు 15', 'ఆగస్టు 31', 'సెప్టెం 15'],
      labelsEn: ['Jun 15', 'Jun 30', 'Jul 15', 'Jul 31', 'Aug 15', 'Aug 31', 'Sep 15'],
      reserveAsk: [2100, 2120, 2150, 2180, 2220, 2280, 2400],
      actualBid: [2140, 2160, 2190, 2230, 2280, 2340, 2480],
      arrivals: [52000, 49500, 46000, 42800, 39500, 36000, 32400]
    }
  },
  cotton: {
    nameTe: 'పత్తి (ఆదిలాబాద్ & వరంగల్)',
    nameEn: 'Raw White Cotton (Adilabad & Warangal)',
    unitTe: '₹ / క్వింటాల్',
    unitEn: '₹ / Quintal',
    currentPrice: 7520,
    priceChange: '+3.8%',
    priceTrend: 'up',
    highPrice: 7680,
    highLocationTe: 'ఆదిలాబాద్ CCI యార్డ్',
    highLocationEn: 'Adilabad CCI Mandi',
    arrivals: '8,650 క్వింటాళ్లు/రోజు',
    arrivalsEn: '8,650 Q/Day',
    arrivalsChangeTe: '▲ +4% (సాధారణ రాకలు)',
    arrivalsChangeEn: '▲ +4% (Steady arrivals)',
    arrivalsTrend: 'up',
    actionAdviceTe: 'మంచి నాణ్యతకు ప్రీమియం',
    actionAdviceEn: 'Premium for <8% Moisture',
    actionSubTe: 'తేమ 8% లోపు ఉంటే ₹7,600 డిమాండ్ చేయండి',
    actionSubEn: 'Demand ₹7,600 if moisture is dry',
    '15D': {
      labelsTe: ['సెప్టెం 1', '3', '5', '7', '9', '11', '13', '15'],
      labelsEn: ['Sep 1', 'Sep 3', 'Sep 5', 'Sep 7', 'Sep 9', 'Sep 11', 'Sep 13', 'Sep 15'],
      reserveAsk: [7250, 7280, 7300, 7320, 7350, 7380, 7400, 7450],
      actualBid: [7320, 7350, 7380, 7420, 7450, 7480, 7500, 7550],
      arrivals: [8200, 8300, 8400, 8450, 8500, 8550, 8600, 8650]
    },
    '30D': {
      labelsTe: ['ఆగస్టు 16', '20', '24', '28', 'సెప్టెం 1', '5', '10', '15'],
      labelsEn: ['Aug 16', 'Aug 20', 'Aug 24', 'Aug 28', 'Sep 1', 'Sep 5', 'Sep 10', 'Sep 15'],
      reserveAsk: [7100, 7150, 7180, 7220, 7250, 7300, 7350, 7450],
      actualBid: [7180, 7220, 7250, 7300, 7340, 7400, 7460, 7550],
      arrivals: [7800, 7950, 8100, 8200, 8350, 8450, 8550, 8650]
    },
    '90D': {
      labelsTe: ['జూన్ 15', 'జూన్ 30', 'జూలై 15', 'జూలై 31', 'ఆగస్టు 15', 'ఆగస్టు 31', 'సెప్టెం 15'],
      labelsEn: ['Jun 15', 'Jun 30', 'Jul 15', 'Jul 31', 'Aug 15', 'Aug 31', 'Sep 15'],
      reserveAsk: [6900, 6950, 7020, 7080, 7150, 7250, 7450],
      actualBid: [6980, 7040, 7100, 7180, 7250, 7360, 7550],
      arrivals: [7100, 7300, 7500, 7750, 8050, 8350, 8650]
    }
  },
  turmeric: {
    nameTe: 'నిజామాబాద్ పసుపు (Nizamabad Turmeric)',
    nameEn: 'Nizamabad Turmeric',
    unitTe: '₹ / క్వింటాల్',
    unitEn: '₹ / Quintal',
    currentPrice: 15400,
    priceChange: '+16.2%',
    priceTrend: 'up',
    highPrice: 16100,
    highLocationTe: 'నిజామాబాద్ APMC రికార్డ్',
    highLocationEn: 'Nizamabad APMC Record',
    arrivals: '6,100 బస్తాలు/రోజు',
    arrivalsEn: '6,100 Bags/Day',
    arrivalsChangeTe: '▼ -25% (కొరత తీవ్రంగా ఉంది)',
    arrivalsChangeEn: '▼ -25% (Severe market deficit)',
    arrivalsTrend: 'down',
    actionAdviceTe: 'గట్టిగా నిల్వ చేయండి (Strong Hold)',
    actionAdviceEn: 'Strong Hold Advisory',
    actionSubTe: 'రాబోయే రోజుల్లో ₹16,500 దాటే అవకాశం',
    actionSubEn: 'Target > ₹16,500 in 2-3 weeks',
    '15D': {
      labelsTe: ['సెప్టెం 1', '3', '5', '7', '9', '11', '13', '15'],
      labelsEn: ['Sep 1', 'Sep 3', 'Sep 5', 'Sep 7', 'Sep 9', 'Sep 11', 'Sep 13', 'Sep 15'],
      reserveAsk: [13800, 14000, 14200, 14500, 14700, 14900, 15100, 15300],
      actualBid: [14200, 14500, 14750, 15000, 15200, 15500, 15800, 16100],
      arrivals: [8500, 8100, 7700, 7300, 6900, 6600, 6300, 6100]
    },
    '30D': {
      labelsTe: ['ఆగస్టు 16', '20', '24', '28', 'సెప్టెం 1', '5', '10', '15'],
      labelsEn: ['Aug 16', 'Aug 20', 'Aug 24', 'Aug 28', 'Sep 1', 'Sep 5', 'Sep 10', 'Sep 15'],
      reserveAsk: [13000, 13200, 13500, 13700, 14000, 14400, 14800, 15300],
      actualBid: [13400, 13700, 14000, 14300, 14600, 15100, 15600, 16100],
      arrivals: [10200, 9600, 9100, 8600, 8000, 7400, 6800, 6100]
    },
    '90D': {
      labelsTe: ['జూన్ 15', 'జూన్ 30', 'జూలై 15', 'జూలై 31', 'ఆగస్టు 15', 'ఆగస్టు 31', 'సెప్టెం 15'],
      labelsEn: ['Jun 15', 'Jun 30', 'Jul 15', 'Jul 31', 'Aug 15', 'Aug 31', 'Sep 15'],
      reserveAsk: [11800, 12100, 12500, 12900, 13400, 14200, 15300],
      actualBid: [12200, 12600, 13000, 13500, 14100, 15000, 16100],
      arrivals: [13500, 12400, 11200, 9900, 8700, 7300, 6100]
    }
  }
};

if (typeof window !== 'undefined') {
  window.TELANGANA_MANDIS = TELANGANA_MANDIS;
  window.CROPS_CONFIG = CROPS_CONFIG;
  window.INITIAL_FARMER_LOTS = INITIAL_FARMER_LOTS;
  window.ACTIVE_ORDERS = ACTIVE_ORDERS;
  window.HOLD_SELL_DATA = HOLD_SELL_DATA;
  window.MARKET_TRENDS_DATA = MARKET_TRENDS_DATA;
}

