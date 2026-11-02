#[derive(Debug, Clone)]
pub struct MarketState {
    pub ticker: String,
    pub strike_price: f64,
    pub spot_price: f64,
    pub open_price: f64,
    pub time_to_expiry_secs: f64,
    pub bid_price: f64,
    pub ask_price: f64,
    pub quote_age_seconds: f64,
}

#[derive(Debug, Clone)]
pub struct ModelFeatures {
    pub signed_distance_from_strike: f64,
    pub realized_volatility_15m: f64,
    pub order_book_imbalance: f64,
    pub btc_move_since_quote: f64,
    pub quote_age_seconds: f64,
    pub rsi_14: f64,
    pub hour_cyclical_sin: f64,
    pub hour_cyclical_cos: f64,
}
