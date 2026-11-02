pub struct RiskManager {
    bankroll: f64,
    max_risk_per_trade: f64,
    bets_placed_this_window: usize,
}

impl RiskManager {
    pub fn new(bankroll: f64, max_risk_per_trade: f64) -> Self {
        Self { bankroll, max_risk_per_trade, bets_placed_this_window: 0 }
    }

    pub fn reset_window(&mut self) {
        self.bets_placed_this_window = 0;
    }

    pub fn can_bet(&self) -> bool {
        self.bets_placed_this_window < 2
    }

    pub fn record_bet(&mut self) {
        self.bets_placed_this_window += 1;
    }

    pub fn validate_circuit_breakers(&self) -> bool {
        self.bankroll > 500.0 && self.can_bet()
    }

    pub fn calculate_kelly_size(&self, model_prob: f64, ask_price: f64, kelly_fraction: f64) -> f64 {
        if ask_price <= 0.0 || ask_price >= 1.0 || !self.can_bet() { return 0.0; }
        let b = (1.0 - ask_price) / ask_price;
        let q = 1.0 - model_prob;
        let f_star = (model_prob * b - q) / b;
        if f_star <= 0.0 { return 0.0; }
        let raw_allocation = self.bankroll * f_star * kelly_fraction;
        raw_allocation.min(self.max_risk_per_trade)
    }
}
