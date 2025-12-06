import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';

// Mock resources data
const categories = [
  { id: 'all', name: 'All', icon: 'apps' },
  { id: 'videos', name: 'Videos', icon: 'play-circle' },
  { id: 'books', name: 'Books', icon: 'book' },
  { id: 'audio', name: 'Audiobooks', icon: 'headset' },
];

const resources = [
  {
    id: '1',
    type: 'video',
    title: 'Effective Shift Handover',
    description: 'Learn best practices for smooth shift transitions',
    duration: '12 min',
    thumbnail: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400',
    category: 'Training',
  },
  {
    id: '2',
    type: 'book',
    title: 'Healthcare Leadership',
    description: 'A comprehensive guide to leading healthcare teams',
    author: 'Dr. Sarah Johnson',
    pages: 285,
    hasAudio: true,
    thumbnail: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400',
    category: 'Leadership',
  },
  {
    id: '3',
    type: 'video',
    title: 'Emergency Response Protocol',
    description: 'Standard procedures for emergency situations',
    duration: '25 min',
    thumbnail: 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=400',
    category: 'Safety',
  },
  {
    id: '4',
    type: 'book',
    title: 'Time Management for Nurses',
    description: 'Strategies to maximize productivity during shifts',
    author: 'Emily Roberts RN',
    pages: 156,
    hasAudio: true,
    thumbnail: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
    category: 'Productivity',
  },
  {
    id: '5',
    type: 'audiobook',
    title: 'Stress Management Techniques',
    description: 'Audio guide for managing workplace stress',
    narrator: 'Michael Chen',
    duration: '2h 15min',
    thumbnail: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400',
    category: 'Wellness',
  },
  {
    id: '6',
    type: 'video',
    title: 'Patient Communication Skills',
    description: 'Improve your bedside manner and patient interactions',
    duration: '18 min',
    thumbnail: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400',
    category: 'Communication',
  },
];

export default function ResourcesScreen() {
  const { colors } = useThemeStore();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedResource, setSelectedResource] = useState<typeof resources[0] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);

  const filteredResources = selectedCategory === 'all' 
    ? resources 
    : resources.filter(r => {
        if (selectedCategory === 'videos') return r.type === 'video';
        if (selectedCategory === 'books') return r.type === 'book';
        if (selectedCategory === 'audio') return r.type === 'audiobook' || (r.type === 'book' && r.hasAudio);
        return true;
      });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return 'play-circle';
      case 'book': return 'book';
      case 'audiobook': return 'headset';
      default: return 'document';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'video': return '#ef4444';
      case 'book': return '#3b82f6';
      case 'audiobook': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const handleTTS = () => {
    setIsTTSPlaying(!isTTSPlaying);
    // In a real app, this would use expo-speech or ElevenLabs TTS API
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              { backgroundColor: colors.card, borderColor: colors.border },
              selectedCategory === cat.id && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Ionicons 
              name={cat.icon as any} 
              size={18} 
              color={selectedCategory === cat.id ? '#fff' : colors.textSecondary} 
            />
            <Text 
              style={[
                styles.categoryText, 
                { color: selectedCategory === cat.id ? '#fff' : colors.text }
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Resources Grid */}
      <ScrollView 
        style={styles.resourcesScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.resourcesContent}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {filteredResources.length} Resources
        </Text>

        <View style={styles.resourcesGrid}>
          {filteredResources.map((resource) => (
            <TouchableOpacity
              key={resource.id}
              style={[styles.resourceCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setSelectedResource(resource)}
            >
              {/* Thumbnail */}
              <View style={styles.thumbnailContainer}>
                <View style={[styles.thumbnailPlaceholder, { backgroundColor: getTypeColor(resource.type) + '20' }]}>
                  <Ionicons name={getTypeIcon(resource.type) as any} size={40} color={getTypeColor(resource.type)} />
                </View>
                <View style={[styles.typeBadge, { backgroundColor: getTypeColor(resource.type) }]}>
                  <Ionicons name={getTypeIcon(resource.type) as any} size={12} color="#fff" />
                  <Text style={styles.typeBadgeText}>{resource.type}</Text>
                </View>
                {resource.type === 'book' && resource.hasAudio && (
                  <View style={[styles.audioBadge, { backgroundColor: '#8b5cf6' }]}>
                    <Ionicons name="headset" size={12} color="#fff" />
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={styles.resourceInfo}>
                <View style={[styles.categoryLabel, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.categoryLabelText, { color: colors.primary }]}>{resource.category}</Text>
                </View>
                <Text style={[styles.resourceTitle, { color: colors.text }]} numberOfLines={2}>
                  {resource.title}
                </Text>
                <Text style={[styles.resourceDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {resource.description}
                </Text>
                <View style={styles.resourceMeta}>
                  <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.resourceMetaText, { color: colors.textSecondary }]}>
                    {resource.duration || `${resource.pages} pages`}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Resource Detail Modal */}
      <Modal
        visible={selectedResource !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedResource(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedResource?.title}
              </Text>
              <TouchableOpacity onPress={() => setSelectedResource(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {selectedResource && (
                <>
                  {/* Thumbnail/Player Area */}
                  <View style={[styles.playerArea, { backgroundColor: getTypeColor(selectedResource.type) + '10' }]}>
                    <View style={[styles.playerIcon, { backgroundColor: getTypeColor(selectedResource.type) + '30' }]}>
                      <Ionicons 
                        name={getTypeIcon(selectedResource.type) as any} 
                        size={60} 
                        color={getTypeColor(selectedResource.type)} 
                      />
                    </View>
                    
                    {(selectedResource.type === 'video' || selectedResource.type === 'audiobook') && (
                      <TouchableOpacity
                        style={[styles.playButton, { backgroundColor: getTypeColor(selectedResource.type) }]}
                        onPress={() => setIsPlaying(!isPlaying)}
                      >
                        <Ionicons name={isPlaying ? 'pause' : 'play'} size={30} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.detailInfo}>
                    <View style={[styles.detailBadge, { backgroundColor: getTypeColor(selectedResource.type) + '20' }]}>
                      <Text style={[styles.detailBadgeText, { color: getTypeColor(selectedResource.type) }]}>
                        {selectedResource.type.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.detailCategory, { color: colors.primary }]}>
                      {selectedResource.category}
                    </Text>
                  </View>

                  <Text style={[styles.detailTitle, { color: colors.text }]}>
                    {selectedResource.title}
                  </Text>
                  
                  <Text style={[styles.detailDesc, { color: colors.textSecondary }]}>
                    {selectedResource.description}
                  </Text>

                  {/* Meta info */}
                  <View style={[styles.metaCard, { backgroundColor: colors.background }]}>
                    {selectedResource.author && (
                      <View style={styles.metaRow}>
                        <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                        <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Author:</Text>
                        <Text style={[styles.metaValue, { color: colors.text }]}>{selectedResource.author}</Text>
                      </View>
                    )}
                    {selectedResource.narrator && (
                      <View style={styles.metaRow}>
                        <Ionicons name="mic-outline" size={18} color={colors.textSecondary} />
                        <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Narrator:</Text>
                        <Text style={[styles.metaValue, { color: colors.text }]}>{selectedResource.narrator}</Text>
                      </View>
                    )}
                    <View style={styles.metaRow}>
                      <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                      <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Duration:</Text>
                      <Text style={[styles.metaValue, { color: colors.text }]}>
                        {selectedResource.duration || `${selectedResource.pages} pages`}
                      </Text>
                    </View>
                  </View>

                  {/* TTS Button for Books */}
                  {selectedResource.type === 'book' && selectedResource.hasAudio && (
                    <TouchableOpacity
                      style={[styles.ttsButton, { backgroundColor: '#8b5cf6' }]}
                      onPress={handleTTS}
                    >
                      {isTTSPlaying ? (
                        <>
                          <ActivityIndicator color="#fff" size="small" />
                          <Text style={styles.ttsButtonText}>Reading aloud...</Text>
                          <TouchableOpacity onPress={() => setIsTTSPlaying(false)}>
                            <Ionicons name="stop-circle" size={24} color="#fff" />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <Ionicons name="volume-high" size={24} color="#fff" />
                          <Text style={styles.ttsButtonText}>Read with TTS</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                    >
                      <Ionicons 
                        name={selectedResource.type === 'video' ? 'play' : 'book-outline'} 
                        size={20} 
                        color="#fff" 
                      />
                      <Text style={styles.actionBtnText}>
                        {selectedResource.type === 'video' ? 'Watch Now' : 'Start Reading'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.actionBtnSecondary, { borderColor: colors.border }]}
                    >
                      <Ionicons name="bookmark-outline" size={20} color={colors.text} />
                      <Text style={[styles.actionBtnSecondaryText, { color: colors.text }]}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categoriesScroll: {
    maxHeight: 60,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resourcesScroll: {
    flex: 1,
  },
  resourcesContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  resourcesGrid: {
    gap: 16,
  },
  resourceCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    height: 120,
    position: 'relative',
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  audioBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceInfo: {
    padding: 14,
  },
  categoryLabel: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryLabelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  resourceDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  resourceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resourceMetaText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  modalScroll: {
    padding: 20,
  },
  playerArea: {
    height: 180,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  playerIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    position: 'absolute',
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  detailBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailCategory: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  detailDesc: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  metaCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaLabel: {
    fontSize: 13,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  ttsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  ttsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  actionBtnSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});



