import React, { useState } from 'react';
import { PlayCircle, BookOpen, TrendingUp, DollarSign, PieChart, Shield, Sparkles } from 'lucide-react';

interface VideoLesson {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  duration: string;
  category: 'basics' | 'trading-strategies' | 'technical-analysis' | 'fundamental-analysis' | 'options';
  thumbnail?: string;
}

// Educational videos about trading, stocks, and crypto - Curated from Investopedia
const LESSONS: VideoLesson[] = [
  // INTRODUCTION TO STOCKS (Basics Category)
  { id: '1', title: 'What Are Stocks?', description: 'Learn the fundamentals of what stocks are and how they work in the financial markets.', youtubeId: 'JrGp4ofULzQ', duration: '3:45', category: 'basics' },
  { id: '2', title: 'History of Stock Market', description: 'Discover the evolution of stock markets from their origins to modern trading.', youtubeId: '5iyvvhipL68', duration: '8:20', category: 'basics' },
  { id: '3', title: 'How Does the Stock Market Work?', description: 'Understand the mechanics of how stock markets operate and facilitate trading.', youtubeId: 'p7HKvqRI_Bo', duration: '5:30', category: 'basics' },
  { id: '4', title: 'Penny Stocks', description: 'Learn about penny stocks, their risks, and potential opportunities.', youtubeId: '8SXJSc8o1Tw', duration: '4:15', category: 'basics' },
  { id: '5', title: 'Basic Elements of Stock Value', description: 'Understand the fundamental factors that determine a stock\'s value.', youtubeId: 'vdXH7cQ1CiM', duration: '6:10', category: 'basics' },
  { id: '6', title: 'What is Initial Margin?', description: 'Learn about margin requirements and how they work in stock trading.', youtubeId: '0SGGSqOZhps', duration: '3:50', category: 'basics' },
  { id: '7', title: 'Pros and Cons of Buying Stocks', description: 'Weigh the advantages and disadvantages of stock market investing.', youtubeId: 'tTpv2iuuObk', duration: '5:25', category: 'basics' },
  { id: '8', title: 'What is a Ticker Symbol?', description: 'Understand stock ticker symbols and how to read them.', youtubeId: 'CKf0PGp2A00', duration: '2:40', category: 'basics' },
  { id: '9', title: 'Shareholder Equity', description: 'Learn about shareholder equity and its importance in company valuation.', youtubeId: '2yulJW7GImU', duration: '4:30', category: 'basics' },
  { id: '10', title: 'Shareholder', description: 'Understand the rights and responsibilities of being a shareholder.', youtubeId: 'JGZJjqhA9wY', duration: '3:15', category: 'basics' },
  { id: '11', title: 'Issued Stocks', description: 'Learn about issued shares and how companies distribute equity.', youtubeId: 'mv1Os-VTd0o', duration: '4:05', category: 'basics' },
  { id: '12', title: 'Employee Stock Options', description: 'Understand how employee stock options work as compensation.', youtubeId: '8td1laTYvcM', duration: '5:50', category: 'basics' },
  { id: '13', title: 'Dividends', description: 'Learn how dividends work and how they benefit shareholders.', youtubeId: '7vSMV4A2_PI', duration: '4:20', category: 'basics' },
  { id: '14', title: 'Difference between GOOG and GOOGL', description: 'Understand the distinction between different share classes.', youtubeId: 'kNQ3xKZ5-28', duration: '3:35', category: 'basics' },
  { id: '15', title: 'Public and Private Companies', description: 'Learn the differences between public and privately owned companies.', youtubeId: '_7nMVT7s_QU', duration: '5:10', category: 'basics' },
  { id: '16', title: 'Stock Broker', description: 'Understand the role of stock brokers in facilitating trades.', youtubeId: 'ymUsQEg-RHs', duration: '4:45', category: 'basics' },
  { id: '17', title: 'Joint Stock Company', description: 'Learn about joint stock companies and their structure.', youtubeId: 'b66ZBSWuaRM', duration: '3:55', category: 'basics' },
  { id: '18', title: 'Short Interest', description: 'Understand short interest and what it indicates about a stock.', youtubeId: 'VivtTfpC4IQ', duration: '4:30', category: 'basics' },
  { id: '19', title: 'Floating Stocks', description: 'Learn about floating stock and available shares for trading.', youtubeId: 'nQRtdkvWKSI', duration: '3:40', category: 'basics' },
  { id: '20', title: 'Stock Splits', description: 'Understand how and why companies split their stock.', youtubeId: '1JTqsCheVY0', duration: '5:15', category: 'basics' },
  { id: '21', title: 'Growth Stocks', description: 'Learn about growth stocks and their investment characteristics.', youtubeId: 'ViNvWPGsfP0', duration: '4:25', category: 'basics' },
  { id: '22', title: 'Treasury Stocks', description: 'Understand treasury stocks and share buyback programs.', youtubeId: 'bzgBLjltpj4', duration: '4:00', category: 'basics' },
  { id: '23', title: 'Stock Right Issues', description: 'Learn about rights issues and how they affect shareholders.', youtubeId: 'pri2k1bYK0w', duration: '4:50', category: 'basics' },
  { id: '24', title: 'Blue Chip Stocks', description: 'Understand blue chip stocks and their investment appeal.', youtubeId: 'wDByKtlSQlg', duration: '3:30', category: 'basics' },
  { id: '25', title: 'Common, Preferred and Capital Stocks', description: 'Learn the differences between various types of stock.', youtubeId: 'AitGIzOz1JU', duration: '5:40', category: 'basics' },
  { id: '26', title: 'Cyclical and Defensive Stocks', description: 'Understand how economic cycles affect different stock types.', youtubeId: 'mdTq11ORvcY', duration: '4:35', category: 'basics' },
  { id: '27', title: 'Market Capitalisation', description: 'Learn how to calculate and interpret market cap.', youtubeId: '_JNlku5xy9Q', duration: '4:10', category: 'basics' },
  { id: '28', title: 'Market Index', description: 'Understand stock market indices and what they measure.', youtubeId: 'EQ-67udZEeg', duration: '5:20', category: 'basics' },
  { id: '29', title: 'ETFs', description: 'Learn about Exchange-Traded Funds and their benefits.', youtubeId: 'OwpFBi-jZVg', duration: '6:00', category: 'basics' },
  { id: '30', title: 'Understanding IPO', description: 'Learn how Initial Public Offerings work and their process.', youtubeId: 'hLaIOHgxcJo', duration: '5:45', category: 'basics' },

  // STOCK TRADING STRATEGIES (Trading Strategies Category)
  { id: '31', title: 'Fundamental vs Technical Analysis', description: 'Compare two major approaches to stock analysis.', youtubeId: 'UMSmmIFM5Yg', duration: '7:20', category: 'trading-strategies' },
  { id: '32', title: 'The Stop Loss Order', description: 'Learn how to use stop loss orders to manage risk.', youtubeId: 'TeHmx3H54jo', duration: '4:50', category: 'trading-strategies' },
  { id: '33', title: 'Value Investing', description: 'Understand the principles of value investing strategy.', youtubeId: '_upBSyx3frY', duration: '6:30', category: 'trading-strategies' },
  { id: '34', title: 'Picking Your Investing Style', description: 'Choose an investment approach that fits your goals.', youtubeId: 'RV5kY34crQY', duration: '5:40', category: 'trading-strategies' },
  { id: '35', title: 'Why Invest in ETFs', description: 'Discover the advantages of ETF investing.', youtubeId: 'aAxZgk_ibDA', duration: '5:15', category: 'trading-strategies' },
  { id: '36', title: 'Active and Passive ETFs', description: 'Compare active and passive ETF management styles.', youtubeId: 'f6Bum-LmV28', duration: '4:45', category: 'trading-strategies' },
  { id: '37', title: 'How to Spot a Troubled Company', description: 'Identify warning signs of financially distressed companies.', youtubeId: '4hvja2hJHJ0', duration: '6:20', category: 'trading-strategies' },
  { id: '38', title: 'Analyze Investments Quickly With Ratios', description: 'Use financial ratios for rapid investment analysis.', youtubeId: 'LzAsRGrcZ74', duration: '7:10', category: 'trading-strategies' },
  { id: '39', title: 'What are Long and Short Positions?', description: 'Understand bullish and bearish trading positions.', youtubeId: 'fXnCtGcvqdk', duration: '5:30', category: 'trading-strategies' },
  { id: '40', title: 'Dollar Cost Averaging', description: 'Learn this systematic investment strategy.', youtubeId: 'ZFEnwg54Zj4', duration: '4:55', category: 'trading-strategies' },
  { id: '41', title: 'Cost Basis on Stock Investment', description: 'Calculate and track your investment cost basis.', youtubeId: 'S4ZXHeT8loE', duration: '5:20', category: 'trading-strategies' },
  { id: '42', title: 'How to Invest in AI', description: 'Explore opportunities in artificial intelligence stocks.', youtubeId: 'B1Exovxv_Yw', duration: '6:45', category: 'trading-strategies' },

  // TECHNICAL ANALYSIS (Technical Analysis Category)
  { id: '43', title: 'Technical Analysis Basics', description: 'Introduction to chart reading and technical analysis.', youtubeId: 'Yv2iYYewdf0', duration: '8:30', category: 'technical-analysis' },
  { id: '44', title: 'Analyzing Stock Trade Volumes', description: 'Use volume analysis to confirm price trends.', youtubeId: 'KOoW7toVIC0', duration: '5:40', category: 'technical-analysis' },
  { id: '45', title: 'Avoid Technical Analysis Pitfalls', description: 'Common mistakes in technical analysis and how to avoid them.', youtubeId: 'Ul1r6h5yYpg', duration: '6:15', category: 'technical-analysis' },
  { id: '46', title: 'How to Use RSI', description: 'Master the Relative Strength Index indicator.', youtubeId: 'hbcCykbX14U', duration: '5:50', category: 'technical-analysis' },
  { id: '47', title: 'Trading with Fibonacci Retracement', description: 'Apply Fibonacci levels to identify support and resistance.', youtubeId: 'Ul9I8zw7lc0', duration: '7:20', category: 'technical-analysis' },
  { id: '48', title: 'Trading with MACD', description: 'Use Moving Average Convergence Divergence for trading signals.', youtubeId: 'VoI9fzjNWDU', duration: '6:40', category: 'technical-analysis' },
  { id: '49', title: 'Trading with Moving Average', description: 'Apply moving averages to identify trends.', youtubeId: 'VoI9fzjNWDU', duration: '6:30', category: 'technical-analysis' },
  { id: '50', title: 'SMA vs EMA', description: 'Compare Simple and Exponential Moving Averages.', youtubeId: 'IvvUbh-cnX4', duration: '5:25', category: 'technical-analysis' },
  { id: '51', title: 'How to Identify Bull Flag Pattern', description: 'Recognize and trade the bull flag continuation pattern.', youtubeId: 'l0vkRqTVIVI', duration: '4:55', category: 'technical-analysis' },
  { id: '52', title: 'How to Identify Stock Trends', description: 'Determine market direction and trend strength.', youtubeId: 'A3jaE4vABKU', duration: '6:10', category: 'technical-analysis' },
  { id: '53', title: 'How to Use Bollinger Bands', description: 'Apply Bollinger Bands for volatility analysis.', youtubeId: 'j5l5nfvP6Dg', duration: '5:45', category: 'technical-analysis' },
  { id: '54', title: 'How to Use Technical Indicators', description: 'Comprehensive guide to popular technical indicators.', youtubeId: 'l5Ysq-Fd2bM', duration: '8:15', category: 'technical-analysis' },
  { id: '55', title: 'Day Trading', description: 'Introduction to day trading strategies and techniques.', youtubeId: 'p0YHNAoVBFs', duration: '7:40', category: 'technical-analysis' },
  { id: '56', title: 'Swing Trading', description: 'Learn swing trading for medium-term position trading.', youtubeId: 'LJF3frcDgRM', duration: '6:55', category: 'technical-analysis' },
  { id: '57', title: 'How to Use Symmetrical Triangle', description: 'Trade the symmetrical triangle chart pattern.', youtubeId: '4lfeq6dZugY', duration: '5:20', category: 'technical-analysis' },
  { id: '58', title: 'How to Use Support and Resistance', description: 'Identify key price levels for trading decisions.', youtubeId: 'xzUCED09Z_A', duration: '6:35', category: 'technical-analysis' },
  { id: '59', title: 'How to Use Stochastic Indicator', description: 'Apply the stochastic oscillator for momentum trading.', youtubeId: 'S1lpICFcda8', duration: '5:50', category: 'technical-analysis' },

  // FUNDAMENTAL ANALYSIS (Fundamental Analysis Category)
  { id: '60', title: 'Fundamental Analysis Basics', description: 'Introduction to company and financial statement analysis.', youtubeId: '3BOE1A8HXeE', duration: '8:45', category: 'fundamental-analysis' },
  { id: '61', title: 'How to Use P/E Ratios', description: 'Understand and apply Price-to-Earnings ratios.', youtubeId: 'J33ObDTsiOU', duration: '5:30', category: 'fundamental-analysis' },
  { id: '62', title: 'How to Read Financial Statements', description: 'Analyze balance sheets, income statements, and cash flows.', youtubeId: 'jXWGXg33hOk', duration: '9:20', category: 'fundamental-analysis' },
  { id: '63', title: 'How to Calculate Intrinsic Value', description: 'Value companies using discounted cash flow analysis.', youtubeId: 'alQlvtFVXr8', duration: '7:40', category: 'fundamental-analysis' },
  { id: '64', title: 'Dividend Yield', description: 'Calculate and evaluate dividend yield for income investing.', youtubeId: 'OmvHUR6He4g', duration: '4:45', category: 'fundamental-analysis' },
  { id: '65', title: 'Earnings Per Share (EPS)', description: 'Understand EPS and its importance in valuation.', youtubeId: 'ZY-6jL-lKXY', duration: '5:15', category: 'fundamental-analysis' },
  { id: '66', title: 'How to Compare Stocks with Valuation Ratios', description: 'Use multiple ratios to compare investment opportunities.', youtubeId: 'K82DCd1wcpI', duration: '6:50', category: 'fundamental-analysis' },
  { id: '67', title: 'How to Research Stocks', description: 'Comprehensive guide to stock research and due diligence.', youtubeId: 'EiiXpecOkwY', duration: '8:30', category: 'fundamental-analysis' },
  { id: '68', title: 'How to Evaluate Dividend Stocks', description: 'Assess dividend sustainability and growth potential.', youtubeId: 'aIP7NIz0ubA', duration: '6:25', category: 'fundamental-analysis' },

  // OPTIONS TRADING (Options Category)
  { id: '69', title: 'Options Basics', description: 'Introduction to call and put options trading.', youtubeId: 'gWp3op51ZzI', duration: '10:15', category: 'options' },
  { id: '70', title: 'Options Greeks', description: 'Understand Delta, Gamma, Theta, Vega, and Rho.', youtubeId: 'jN4QODy000Y', duration: '8:45', category: 'options' }
];

const CATEGORIES = [
  { id: 'all', label: 'All Lessons', icon: BookOpen, color: 'playful-green' },
  { id: 'basics', label: 'Stock Basics', icon: Sparkles, color: 'playful-orange' },
  { id: 'trading-strategies', label: 'Trading Strategies', icon: TrendingUp, color: 'playful-green' },
  { id: 'technical-analysis', label: 'Technical Analysis', icon: PieChart, color: 'playful-orange' },
  { id: 'fundamental-analysis', label: 'Fundamental Analysis', icon: Shield, color: 'playful-green' },
  { id: 'options', label: 'Options', icon: DollarSign, color: 'playful-orange' }
];

export const LearnPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVideo, setSelectedVideo] = useState<VideoLesson | null>(null);

  const filteredLessons = selectedCategory === 'all'
    ? LESSONS
    : LESSONS.filter(lesson => lesson.category === selectedCategory);

  const handleVideoSelect = (lesson: VideoLesson) => {
    setSelectedVideo(lesson);
  };

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-3 py-2.5">
        {/* Header */}
        <div className="text-center mb-3">
          <h1 className="text-xs md:text-xs font-bold font-display text-[#2C2C2C] mb-3">
            Learn to Trade
          </h1>
          <p className="text-xs text-[#5C5C5C] font-body max-w-2xl mx-auto">
            Master the art of trading with our comprehensive video lessons covering stocks, crypto, and portfolio management
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex justify-center gap-10 flex-wrap mb-3">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl font-display font-semibold transition-all duration-200 border-3 ${
                  selectedCategory === category.id
                    ? `bg-${category.color} text-white border-black shadow-lg scale-105`
                    : 'bg-white text-[#2C2C2C] border-black/20 hover:bg-gray-50 hover:scale-105'
                }`}
              >
                <Icon className="w-5 h-5" />
                {category.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="bg-white/95 border-4 border-black rounded-[32px] shadow-2xl overflow-hidden">
              {selectedVideo ? (
                <>
                  <div className="aspect-video bg-black">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}`}
                      title={selectedVideo.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    ></iframe>
                  </div>
                  <div className="p-3">
                    <h2 className="text-xs font-display font-bold text-[#2C2C2C] mb-3">
                      {selectedVideo.title}
                    </h2>
                    <p className="text-[#5C5C5C] font-body mb-3">
                      {selectedVideo.description}
                    </p>
                    <div className="flex items-center gap-10">
                      <span className="px-3 py-2.5 bg-playful-green/10 text-playful-green rounded-full text-xs font-body font-semibold border-2 border-playful-green/20">
                        {selectedVideo.category.charAt(0).toUpperCase() + selectedVideo.category.slice(1)}
                      </span>
                      <span className="text-xs text-[#5C5C5C] font-body">
                        Duration: {selectedVideo.duration}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-playful-cream to-playful-green/10 p-3">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-playful-green/10 rounded-2xl border-2 border-black flex items-center justify-center mx-auto mb-3">
                      <PlayCircle className="w-12 h-12 text-playful-green" />
                    </div>
                    <h3 className="text-xs font-display font-bold text-[#2C2C2C] mb-3">
                      Select a Lesson to Begin
                    </h3>
                    <p className="text-[#5C5C5C] font-body max-w-md">
                      Choose from our curated collection of educational videos to start your learning journey
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lesson List */}
          <div className="lg:col-span-1">
            <div className="bg-white/95 border-4 border-black rounded-[32px] p-3 shadow-2xl max-h-[800px] overflow-y-auto">
              <h3 className="text-xs font-display font-bold text-[#2C2C2C] mb-3 flex items-center gap-10">
                <BookOpen className="w-6 h-6 text-playful-orange" />
                Lessons ({filteredLessons.length})
              </h3>

              <div className="space-y-3">
                {filteredLessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => handleVideoSelect(lesson)}
                    className={`w-full text-left p-3 rounded-2xl border-3 transition-all duration-200 group ${
                      selectedVideo?.id === lesson.id
                        ? 'bg-playful-green/10 border-playful-green shadow-lg'
                        : 'bg-white border-black/20 hover:border-playful-green/50 hover:bg-playful-cream/30'
                    }`}
                  >
                    <div className="flex items-start gap-10">
                      <div className="w-14 h-14 bg-black/5 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-playful-green/20 transition-colors">
                        <PlayCircle className={`w-8 h-8 ${
                          selectedVideo?.id === lesson.id ? 'text-playful-green' : 'text-[#5C5C5C]'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-display font-bold text-[#2C2C2C] text-xs mb-1 line-clamp-2">
                          {lesson.title}
                        </h4>
                        <div className="flex items-center gap-2.5 text-xs">
                          <span className="px-2 py-1 bg-white border border-black/10 rounded-full text-[#5C5C5C] font-body font-medium">
                            {lesson.category}
                          </span>
                          <span className="text-[#5C5C5C] font-body">
                            {lesson.duration}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Tips Section */}
        <div className="mt-3">
          <div className="bg-gradient-to-r from-playful-green/10 to-playful-orange/10 border-4 border-black rounded-[32px] p-3 shadow-2xl">
            <h3 className="text-xs font-display font-bold text-[#2C2C2C] mb-3 flex items-center gap-10">
              <Sparkles className="w-7 h-7 text-playful-orange" />
              Quick Learning Tips
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="bg-white border-3 border-black rounded-2xl p-3">
                <div className="w-12 h-12 bg-playful-green rounded-2xl border-2 border-black flex items-center justify-center mb-3">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-display font-bold text-[#2C2C2C] mb-2">Start with Basics</h4>
                <p className="text-xs text-[#5C5C5C] font-body">
                  Build a solid foundation by understanding market fundamentals before moving to advanced topics.
                </p>
              </div>
              <div className="bg-white border-3 border-black rounded-2xl p-3">
                <div className="w-12 h-12 bg-playful-orange rounded-2xl border-2 border-black flex items-center justify-center mb-3">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-display font-bold text-[#2C2C2C] mb-2">Practice Regularly</h4>
                <p className="text-xs text-[#5C5C5C] font-body">
                  Apply what you learn by practicing with our platform and tracking your progress.
                </p>
              </div>
              <div className="bg-white border-3 border-black rounded-2xl p-3">
                <div className="w-12 h-12 bg-playful-green rounded-2xl border-2 border-black flex items-center justify-center mb-3">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-display font-bold text-[#2C2C2C] mb-2">Manage Risk</h4>
                <p className="text-xs text-[#5C5C5C] font-body">
                  Always prioritize risk management and never invest more than you can afford to lose.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
