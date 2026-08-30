import React, { useState } from 'react';
import { ShieldAlert, AlertCircle, Sparkles, CheckCircle, Calculator } from 'lucide-react';

export default function ResponsibleGambling() {
  const [income, setIncome] = useState('');
  const [calculatedLimit, setCalculatedLimit] = useState<number | null>(null);
  const [stakingAdvice, setStakingAdvice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCalculateLimit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const incVal = Number(income);
    if (isNaN(incVal) || incVal <= 0) {
      setErrorMsg('Please enter a valid monthly amount greater than 0.');
      return;
    }

    // Responsible limit is 1-3% of monthly income
    const safeLimit = Math.round(incVal * 0.02);
    setCalculatedLimit(safeLimit);

    if (safeLimit < 500) {
      setStakingAdvice('Maintain micro-stakes (e.g. 50-100 KES per bet) and strictly focus on Safe Accumulators with combined odds around 2.00 to 3.00 to hedge variance.');
    } else if (safeLimit < 5000) {
      setStakingAdvice('Stick to a flat-staking model: Allocate exactly 2% of your calculated limit per wager. Backing our Daily Safe and Balanced accumulators with discipline yields consistent ROI over 30 days.');
    } else {
      setStakingAdvice('High-liquidity bankroll detected: Divide this limit into 50 equal units. Stake 1 unit flat across selected VIP high-confidence tennis or football singles to optimize statistical yield.');
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-8" id="responsible-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="space-y-1">
          <h3 className="text-lg font-sans font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-400" />
            Responsible Gambling & Staking Guard
          </h3>
          <p className="text-xs text-gray-400">At Rafiki Predict, we utilize machine learning to forecast outcomes. Sports wagers contain natural variance.</p>
        </div>

        <div className="flex items-center bg-red-950/30 border border-red-500/20 px-3.5 py-1.5 rounded-xl gap-2 font-mono text-xs text-red-400 uppercase font-bold shrink-0">
          <AlertCircle className="w-4 h-4 text-red-400" />
          Strictly 18+ Only
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Betting limit calculator */}
        <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-xl space-y-4">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Safe Betting Limit Calculator
          </h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            Enter your monthly net disposable budget (money you have left after essential bills/rent). We will calculate a safe, mathematically optimized monthly betting bankroll.
          </p>

          <form onSubmit={handleCalculateLimit} className="space-y-3">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 font-mono">Net Monthly Budget (KES or USD)</label>
              <input
                type="number"
                required
                placeholder="e.g. 20000"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white focus:border-emerald-500"
              />
            </div>
            {errorMsg && (
              <div className="p-2.5 bg-red-950/40 border border-red-500/30 rounded-lg text-[11px] text-red-400 font-medium flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 text-white font-sans font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
            >
              Calculate Bankroll Limits
            </button>
          </form>

          {calculatedLimit !== null && (
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/10 rounded-xl space-y-2.5 animate-fadeIn">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-400">Safe Monthly Limit:</span>
                <span className="text-lg font-mono font-bold text-emerald-400">{calculatedLimit} Units</span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
                <strong className="text-white">Expert Staking Plan:</strong> {stakingAdvice}
              </p>
            </div>
          )}
        </div>

        {/* Self Checklist & Helplines */}
        <div className="space-y-5">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
            Safe Betting Guidelines
          </h4>

          <ul className="space-y-3.5 text-xs text-gray-300">
            {[
              'Wager with budget allocated solely for entertainment purposes.',
              'Never attempt to chase losses with larger stakes (double up models).',
              'Set fixed time limit goals for checking sportsbook lines.',
              'Predictions are statistical, historical probabilities, not guarantees.',
              'Treat betting as an intellectual strategy hobby, not a primary salary.'
            ].map((rule, idx) => (
              <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>

          <div className="border-t border-zinc-800 pt-5 space-y-2">
            <h5 className="text-xs font-bold text-white">Need Professional Support?</h5>
            <p className="text-xs text-gray-400 leading-relaxed">
              If you feel betting is impacting your personal well-being or budget, contact free counseling helplines immediately.
            </p>
            <div className="bg-zinc-950 px-3 py-2.5 rounded-lg text-[10px] font-mono text-emerald-300 border border-zinc-850 flex justify-between">
              <span>National Gambling Support Helpline:</span>
              <span>0808 8020 133</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
