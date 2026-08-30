import React, { useState } from 'react';
import { 
  X, 
  Globe, 
  MessageSquare, 
  Send, 
  Mail, 
  Check, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Share2,
  Users
} from 'lucide-react';

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'en' | 'sw';
}

interface SocialChannel {
  id: string;
  name: string;
  handle: string;
  url: string;
  type: 'x' | 'instagram' | 'whatsapp' | 'telegram' | 'email' | 'facebook';
  iconEmoji: string;
  accentColor: string;
  borderColor: string;
  bgGradient: string;
  category: 'Live Alerts' | 'Social Feed' | 'Direct Admin Support' | 'Discussion Group';
  descriptionEn: string;
  descriptionSw: string;
  verified: boolean;
}

const OFFICIAL_CHANNELS: SocialChannel[] = [
  {
    id: 'whatsapp-admin',
    name: 'WhatsApp VIP Support & Admin',
    handle: '+254 716 483 642',
    url: 'https://wa.me/254716483642?text=Hello%20Rafiki%20Admin%2C%20I%20am%20contacting%20from%20the%20Official%20App',
    type: 'whatsapp',
    iconEmoji: '💬',
    accentColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    bgGradient: 'from-emerald-950/40 to-zinc-950',
    category: 'Direct Admin Support',
    descriptionEn: 'Instant payment verification, direct VIP subscription activation, and 24/7 dedicated customer assistance.',
    descriptionSw: 'Uthibitisho wa papo hapo wa malipo, uanzishaji wa VIP moja kwa moja, na huduma kwa wateja 24/7.',
    verified: true
  },
  {
    id: 'twitter-x',
    name: 'X (Formerly Twitter)',
    handle: '@Blaisejondez',
    url: 'https://x.com/Blaisejondez',
    type: 'x',
    iconEmoji: '𝕏',
    accentColor: 'text-zinc-100',
    borderColor: 'border-zinc-700/60',
    bgGradient: 'from-zinc-900 to-zinc-950',
    category: 'Social Feed',
    descriptionEn: 'Daily prediction releases, breaking squad injury analysis, and global football match commentary.',
    descriptionSw: 'Matokeo ya kila siku ya utabiri, taarifa za majeruhi wa timu, na uchambuzi wa soka duniani.',
    verified: true
  },
  {
    id: 'instagram-official',
    name: 'Instagram Official',
    handle: '@rafikisportspredict',
    url: 'https://www.instagram.com/rafikisportspredict?igsi=MXJzMXFtb2U2M2hhZg==',
    type: 'instagram',
    iconEmoji: '📸',
    accentColor: 'text-pink-400',
    borderColor: 'border-pink-500/40',
    bgGradient: 'from-pink-950/30 to-zinc-950',
    category: 'Social Feed',
    descriptionEn: 'Visual betting slip highlights, winning slips showcase, and match-day graphics.',
    descriptionSw: 'Picha za ushindi wa mkeka, viangazio vya mechi za siku, na picha za kipekee.',
    verified: true
  },
  {
    id: 'telegram-channel',
    name: 'Telegram Broadcast & VIP Alerts',
    handle: '@rafikipredict',
    url: 'https://t.me/rafikipredict',
    type: 'telegram',
    iconEmoji: '✈️',
    accentColor: 'text-sky-400',
    borderColor: 'border-sky-500/40',
    bgGradient: 'from-sky-950/30 to-zinc-950',
    category: 'Live Alerts',
    descriptionEn: 'Real-time kickoff notifications, early accumulator drops, and rapid odds movement alerts.',
    descriptionSw: 'Arifa za moja kwa moja za mechi kuanza, mikusanyiko ya mapema, na mabadiliko ya odds.',
    verified: true
  },
  {
    id: 'email-desk',
    name: 'Official Email Helpdesk',
    handle: 'rafikibc1000@gmail.com',
    url: 'mailto:rafikibc1000@gmail.com?subject=Rafiki%20Predict%20Inquiry',
    type: 'email',
    iconEmoji: '✉️',
    accentColor: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    bgGradient: 'from-amber-950/30 to-zinc-950',
    category: 'Direct Admin Support',
    descriptionEn: 'Official business inquiries, partnership requests, and formal billing dispute inquiries.',
    descriptionSw: 'Maswali rasmi ya kibiashara, ushirikiano, na masuala ya ankara za malipo.',
    verified: true
  },
  {
    id: 'community-forum',
    name: 'Global Sports Community',
    handle: 'Rafiki Sports Predict Global',
    url: 'https://wa.me/254716483642?text=Join%20Rafiki%20Global%20Community%20Group',
    type: 'facebook',
    iconEmoji: '🌍',
    accentColor: 'text-teal-400',
    borderColor: 'border-teal-500/40',
    bgGradient: 'from-teal-950/30 to-zinc-950',
    category: 'Discussion Group',
    descriptionEn: 'Engage with fellow sports analysts and punters across the UK, Europe, Americas, and Africa.',
    descriptionSw: 'Zungumza na wachambuzi wengine wa michezo kutoka Uingereza, Ulaya, Amerika na Afrika.',
    verified: true
  }
];

export default function CommunityModal({ isOpen, onClose, language = 'en' }: CommunityModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const categories = ['all', 'Direct Admin Support', 'Social Feed', 'Live Alerts', 'Discussion Group'];

  const filteredChannels = filterCategory === 'all' 
    ? OFFICIAL_CHANNELS 
    : OFFICIAL_CHANNELS.filter(c => c.category === filterCategory);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
      id="community-social-modal-overlay"
    >
      <div 
        className="bg-zinc-950 border border-zinc-800/90 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
        id="community-social-modal"
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 p-5 sm:p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl font-bold shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-sans font-black text-white tracking-tight">
                  {language === 'en' ? 'Official Community & Social Hub' : 'Kituo Rasmi cha Jamii na Mitandao'}
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  {language === 'en' ? 'Verified Official' : 'Imethibitishwa'}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {language === 'en' 
                  ? 'Connect with certified Rafiki administrators, receive breaking alerts, and join our global punters network.' 
                  : 'Ungana na wasimamizi rasmi wa Rafiki, pokea arifa za haraka, na ujiunge na mtandao wetu wa kimataifa.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-gray-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  filterCategory === cat
                    ? 'bg-emerald-500 text-black border-emerald-500 font-bold shadow-sm'
                    : 'bg-zinc-900 border-zinc-800 text-gray-300 hover:text-white hover:border-zinc-700'
                }`}
              >
                {cat === 'all' ? (language === 'en' ? '🌐 All Channels' : '🌐 Vituo Vyote') : cat}
              </button>
            ))}
          </div>

          {/* 3-Column Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredChannels.map((channel) => {
              const isExpanded = expandedId === channel.id;
              const isCopied = copiedId === channel.id;

              return (
                <div
                  key={channel.id}
                  id={`social-channel-${channel.id}`}
                  className={`bg-gradient-to-b ${channel.bgGradient} border ${channel.borderColor} rounded-2xl p-4 flex flex-col justify-between transition-all hover:shadow-xl relative overflow-hidden`}
                >
                  <div className="space-y-3">
                    {/* Channel Top Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-xl shadow-inner shrink-0">
                          {channel.iconEmoji}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-bold text-white truncate">{channel.name}</h3>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" title="Verified Channel" />
                          </div>
                          <span className="text-[10px] font-mono text-zinc-400 block truncate">
                            {channel.handle}
                          </span>
                        </div>
                      </div>

                      <span className="text-[9px] font-mono font-bold bg-zinc-950/80 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-800/80 uppercase shrink-0">
                        {channel.category}
                      </span>
                    </div>

                    {/* Channel Description */}
                    <p className={`text-xs text-gray-300 leading-relaxed font-sans ${!isExpanded ? 'line-clamp-2' : ''}`}>
                      {language === 'en' ? channel.descriptionEn : channel.descriptionSw}
                    </p>

                    {/* Expand / Collapse description toggle */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : channel.id)}
                      className="text-[10px] font-mono text-gray-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3 h-3" />
                          <span>{language === 'en' ? 'Show Less' : 'Onyesha Kidogo'}</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" />
                          <span>{language === 'en' ? 'Read More' : 'Soma Zaidi'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-3 mt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={(e) => handleCopy(channel.id, channel.handle, e)}
                      className="px-2.5 py-1.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-gray-300 hover:text-white rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer"
                      title={`Copy ${channel.handle}`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <a
                      href={channel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer text-center font-sans"
                    >
                      <span>{language === 'en' ? 'Connect' : 'Unganisha'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Direct WhatsApp Callout Banner */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-2xl shrink-0">
                💬
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-white font-sans">
                  {language === 'en' ? 'Need Immediate VIP Setup or Custom Slips?' : 'Unahitaji Usanidi wa Haraka wa VIP au Mikasi Maalum?'}
                </h4>
                <p className="text-xs text-gray-300">
                  {language === 'en' 
                    ? 'Our certified betting desk administrator is directly accessible on WhatsApp (+254 716 483 642) for instant response.' 
                    : 'Msimamizi wetu anapatikana moja kwa moja WhatsApp (+254 716 483 642) kwa majibu ya haraka.'}
                </p>
              </div>
            </div>

            <a
              href="https://wa.me/254716483642?text=Hello%20Admin%2C%20I%20need%20immediate%20assistance%20with%20my%20Rafiki%20Predict%20account"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20 whitespace-nowrap active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>Chat on WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
