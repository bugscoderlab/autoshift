import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Book, 
  Headphones, 
  Clock, 
  User, 
  X, 
  Bookmark, 
  Volume2,
  Pause,
  StopCircle
} from 'lucide-react';
import clsx from 'clsx';

// Mock resources data
const categories = [
  { id: 'all', name: 'All', icon: 'grid' },
  { id: 'videos', name: 'Videos', icon: 'play' },
  { id: 'books', name: 'Books', icon: 'book' },
  { id: 'audio', name: 'Audiobooks', icon: 'headphones' },
];

const resources = [
  {
    id: '1',
    type: 'video',
    title: 'Effective Shift Handover',
    description: 'Learn best practices for smooth shift transitions and communication between teams.',
    duration: '12 min',
    category: 'Training',
  },
  {
    id: '2',
    type: 'book',
    title: 'Healthcare Leadership',
    description: 'A comprehensive guide to leading healthcare teams with practical strategies.',
    author: 'Dr. Sarah Johnson',
    pages: 285,
    hasAudio: true,
    category: 'Leadership',
  },
  {
    id: '3',
    type: 'video',
    title: 'Emergency Response Protocol',
    description: 'Standard procedures for emergency situations in healthcare settings.',
    duration: '25 min',
    category: 'Safety',
  },
  {
    id: '4',
    type: 'book',
    title: 'Time Management for Nurses',
    description: 'Strategies to maximize productivity during shifts and reduce burnout.',
    author: 'Emily Roberts RN',
    pages: 156,
    hasAudio: true,
    category: 'Productivity',
  },
  {
    id: '5',
    type: 'audiobook',
    title: 'Stress Management Techniques',
    description: 'Audio guide for managing workplace stress and maintaining mental health.',
    narrator: 'Michael Chen',
    duration: '2h 15min',
    category: 'Wellness',
  },
  {
    id: '6',
    type: 'video',
    title: 'Patient Communication Skills',
    description: 'Improve your bedside manner and patient interactions for better outcomes.',
    duration: '18 min',
    category: 'Communication',
  },
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'video': return Play;
    case 'book': return Book;
    case 'audiobook': return Headphones;
    default: return Book;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'video': return 'from-rose-500 to-red-600';
    case 'book': return 'from-blue-500 to-indigo-600';
    case 'audiobook': return 'from-purple-500 to-violet-600';
    default: return 'from-gray-500 to-slate-600';
  }
};

export default function Resources() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedResource, setSelectedResource] = useState<typeof resources[0] | null>(null);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);

  const filteredResources = selectedCategory === 'all' 
    ? resources 
    : resources.filter(r => {
        if (selectedCategory === 'videos') return r.type === 'video';
        if (selectedCategory === 'books') return r.type === 'book';
        if (selectedCategory === 'audio') return r.type === 'audiobook' || (r.type === 'book' && r.hasAudio);
        return true;
      });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Resources</h1>
          <p className="text-white/60">Training materials, books, and audiobooks for professional development</p>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-3 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={clsx(
              'px-5 py-2.5 rounded-xl font-medium transition-all duration-200',
              selectedCategory === cat.id
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map((resource, index) => {
          const TypeIcon = getTypeIcon(resource.type);
          return (
            <motion.div
              key={resource.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card-hover cursor-pointer"
              onClick={() => setSelectedResource(resource)}
            >
              {/* Thumbnail Area */}
              <div className={clsx(
                'h-40 rounded-xl mb-4 flex items-center justify-center bg-gradient-to-br relative overflow-hidden',
                getTypeColor(resource.type)
              )}>
                <div className="absolute inset-0 bg-black/10" />
                <TypeIcon className="w-16 h-16 text-white/80" />
                
                {/* Type Badge */}
                <div className="absolute top-3 left-3 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-lg">
                  <span className="text-white text-xs font-medium capitalize">{resource.type}</span>
                </div>
                
                {/* Audio Badge for Books */}
                {resource.type === 'book' && resource.hasAudio && (
                  <div className="absolute top-3 right-3 bg-purple-500 p-2 rounded-lg">
                    <Headphones className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="bg-primary-500/20 text-primary-300 text-xs font-medium px-2 py-1 rounded">
                    {resource.category}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-white line-clamp-2">
                  {resource.title}
                </h3>
                
                <p className="text-white/60 text-sm line-clamp-2">
                  {resource.description}
                </p>

                <div className="flex items-center gap-4 text-white/50 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{resource.duration || `${resource.pages} pages`}</span>
                  </div>
                  {resource.author && (
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span className="truncate">{resource.author}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Resource Detail Modal */}
      <AnimatePresence>
        {selectedResource && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedResource(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="card w-full max-w-2xl max-h-[90vh] overflow-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br',
                    getTypeColor(selectedResource.type)
                  )}>
                    {(() => {
                      const Icon = getTypeIcon(selectedResource.type);
                      return <Icon className="w-6 h-6 text-white" />;
                    })()}
                  </div>
                  <div>
                    <span className="text-white/60 text-sm capitalize">{selectedResource.type}</span>
                    <h2 className="text-xl font-bold text-white">{selectedResource.title}</h2>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedResource(null)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>

              {/* Player Area */}
              <div className={clsx(
                'h-48 rounded-xl mb-6 flex items-center justify-center bg-gradient-to-br relative',
                getTypeColor(selectedResource.type)
              )}>
                <div className="absolute inset-0 bg-black/20 rounded-xl" />
                {(() => {
                  const Icon = getTypeIcon(selectedResource.type);
                  return <Icon className="w-20 h-20 text-white/80" />;
                })()}
                
                {(selectedResource.type === 'video' || selectedResource.type === 'audiobook') && (
                  <button className="absolute bottom-4 bg-white text-gray-900 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                    <Play className="w-6 h-6 ml-1" />
                  </button>
                )}
              </div>

              {/* Info */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <span className="bg-primary-500/20 text-primary-300 text-sm font-medium px-3 py-1 rounded-lg">
                    {selectedResource.category}
                  </span>
                  {selectedResource.type === 'book' && selectedResource.hasAudio && (
                    <span className="bg-purple-500/20 text-purple-300 text-sm font-medium px-3 py-1 rounded-lg flex items-center gap-1">
                      <Headphones className="w-4 h-4" /> Audio Available
                    </span>
                  )}
                </div>

                <p className="text-white/70">
                  {selectedResource.description}
                </p>

                <div className="bg-white/5 rounded-xl p-4 space-y-3">
                  {selectedResource.author && (
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-white/50" />
                      <span className="text-white/60">Author:</span>
                      <span className="text-white">{selectedResource.author}</span>
                    </div>
                  )}
                  {selectedResource.narrator && (
                    <div className="flex items-center gap-3">
                      <Headphones className="w-5 h-5 text-white/50" />
                      <span className="text-white/60">Narrator:</span>
                      <span className="text-white">{selectedResource.narrator}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-white/50" />
                    <span className="text-white/60">Duration:</span>
                    <span className="text-white">
                      {selectedResource.duration || `${selectedResource.pages} pages`}
                    </span>
                  </div>
                </div>
              </div>

              {/* TTS Button for Books */}
              {selectedResource.type === 'book' && selectedResource.hasAudio && (
                <button
                  onClick={() => setIsTTSPlaying(!isTTSPlaying)}
                  className={clsx(
                    'w-full py-4 rounded-xl font-medium flex items-center justify-center gap-3 mb-4 transition-all',
                    isTTSPlaying 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                  )}
                >
                  {isTTSPlaying ? (
                    <>
                      <StopCircle className="w-5 h-5" />
                      <span>Stop Reading</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-5 h-5" />
                      <span>Read Aloud with TTS</span>
                    </>
                  )}
                </button>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {selectedResource.type === 'video' ? (
                    <>
                      <Play className="w-5 h-5" />
                      Watch Now
                    </>
                  ) : (
                    <>
                      <Book className="w-5 h-5" />
                      Start Reading
                    </>
                  )}
                </button>
                <button className="btn-secondary flex items-center gap-2">
                  <Bookmark className="w-5 h-5" />
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

