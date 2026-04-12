import { StyleSheet } from '~/lib/unistyles';
import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');
export const vw = width / 100;
export const vh = height / 100;

export const styles = StyleSheet.create((theme) => ({
  absoluteFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  backgroundImage: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },

  headerContainer: {
    paddingLeft: vw * 5,
    marginTop: vh * 16, // Slightly reduced top margin
  },

  headerTitle: {
    fontSize: vw * 10, // Reduced to prevent overlap
    fontFamily: theme.fonts.header,
    fontWeight: theme.fontWeights.extraBold,
    color: theme.colors.textDark,
    marginBottom: vh * 2, // Added spacing
  },

  arrowIcon: {
    margin: vw * 1.5,
  },

  contentContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: vw * 6,
    borderTopRightRadius: vw * 6,
    height: '45%',
  },

  carouselContainer: {
    paddingTop: vh * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  plantCard: {
    width: width - vw * 12,
    height: Math.min(Math.max(height * 0.29, 230), 290),
    borderRadius: Math.min(Math.max(vw * 6, 22), 28),
    overflow: 'visible',
    alignSelf: 'center',
  },
  plantCardExpanded: {
    height: Math.min(Math.max(height * 0.46, 360), 470),
  },

  gradient: {
    flex: 1,
    borderRadius: Math.min(Math.max(vw * 6, 22), 28),
    paddingHorizontal: Math.min(Math.max(vw * 5, 18), 24),
    paddingVertical: Math.min(Math.max(vh * 2.2, 16), 22),
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },

  image: {
    width: Math.min(Math.max(vw * 24, 88), 112),
    height: Math.min(Math.max(vw * 24, 88), 112),
    marginRight: Math.min(Math.max(vw * 4.5, 14), 20),
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    resizeMode: 'cover',
  },

  infoColumn: {
    flex: 1,
    justifyContent: 'center',
  },

  name: {
    fontSize: Math.min(Math.max(vw * 6.8, 24), 32),
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.textDark,
    fontFamily: theme.fonts.regular,
  },

  points: {
    fontSize: Math.min(Math.max(vw * 3.6, 13), 16),
    color: theme.colors.typography,
    marginTop: Math.min(Math.max(vh * 0.5, 4), 8),
    opacity: 0.7,
  },

  plantCardActionButton: {
    position: 'absolute',
    top: Math.min(Math.max(vh * 1.2, 10), 16),
    right: Math.min(Math.max(vw * 3, 10), 14),
    padding: Math.min(Math.max(vw * 2, 8), 12),
    zIndex: 10,
  },

  backGradient: {
    flex: 1,
    borderRadius: Math.min(Math.max(vw * 6, 22), 28),
    padding: Math.min(Math.max(vw * 4.5, 16), 22),
  },

  backContent: {
    flex: 1,
  },

  backTitle: {
    fontSize: vw * 6,
    fontFamily: theme.fonts.header,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.typography,
  },

  backRow: {
    flexDirection: 'row',
    gap: vw * 5, // Kept gap
    width: '100%',
    marginTop: vh * 1, // Restored margin
  },

  column: {
    flex: 1,
  },

  field: {
    marginBottom: Math.min(Math.max(vh * 1.4, 10), 16),
  },
  inputMultiline: {
    minHeight: Math.min(Math.max(vh * 9, 86), 120),
    textAlignVertical: 'top',
  },

  label: {
    color: theme.colors.typography,
    opacity: 0.85,
    marginBottom: 6,
    fontSize: vw * 3.5,
  },

  input: {
    backgroundColor:
      theme.colors.background === '#121212' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    borderRadius: Math.min(Math.max(vw * 2.5, 10), 14),
    paddingVertical: Math.min(Math.max(vh * 1, 10), 14),
    paddingHorizontal: Math.min(Math.max(vw * 3, 12), 16),
    color: theme.colors.text,
    fontSize: Math.min(Math.max(vw * 3.5, 13), 15),
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Math.min(Math.max(vw * 2, 8), 12),
    width: '100%',
    marginTop: Math.min(Math.max(vh * 1, 8), 12),
  },

  saveButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    minHeight: Math.min(Math.max(vh * 5.4, 44), 52),
    borderRadius: Math.min(Math.max(vw * 2.5, 10), 14),
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    minHeight: Math.min(Math.max(vh * 5.4, 44), 52),
    borderRadius: Math.min(Math.max(vw * 2.5, 10), 14),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.typography,
  },

  buttonText: {
    color: '#FFF',
    fontSize: vw * 3.5,
    fontWeight: 'bold',
  },

  cancelButtonText: {
    color: theme.colors.typography,
    fontSize: vw * 3.5,
    fontWeight: 'bold',
  },
  backScrollContent: {
    paddingBottom: vh * 1,
  },
  sensorCard: {
    borderRadius: vw * 4,
    padding: vw * 4,
    backgroundColor:
      theme.colors.background === '#121212' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor:
      theme.colors.background === '#121212' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.34)',
  },
  sensorTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vh * 0.8,
  },
  sensorTitle: {
    color: theme.colors.typography,
    fontSize: vw * 4.2,
    fontWeight: '700',
  },
  sensorBadgeConnected: {
    paddingHorizontal: vw * 2.4,
    paddingVertical: vh * 0.5,
    borderRadius: 999,
    backgroundColor: 'rgba(64,176,108,0.2)',
  },
  sensorBadgeIdle: {
    paddingHorizontal: vw * 2.4,
    paddingVertical: vh * 0.5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  sensorBadgeText: {
    color: theme.colors.textDark,
    fontSize: vw * 2.8,
    fontWeight: '700',
  },
  sensorIdText: {
    color: theme.colors.textDark,
    fontSize: vw * 3.6,
    fontWeight: '700',
    marginBottom: vh * 0.4,
  },
  sensorHelperText: {
    color: theme.colors.typography,
    fontSize: vw * 3.2,
    lineHeight: vh * 2.1,
    opacity: 0.8,
  },
  sensorLinkButton: {
    marginTop: vh * 1.2,
    minHeight: vh * 5.2,
    borderRadius: vw * 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  sensorLinkButtonText: {
    color: '#fff',
    fontSize: vw * 3.5,
    fontWeight: '800',
  },
  iconsView: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: width - vw * 12,
    height: Math.min(Math.max(height * 0.29, 230), 290),
  },

  emptyListText: {
    fontSize: 18,
    color: theme.colors.text,
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
  },

  dotsWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },

  dotSmall: {
    width: 6,
    height: 6,
    borderRadius: 5,
    backgroundColor: theme.colors.greyedOut,
    marginHorizontal: 6,
  },

  dotSmallActive: {
    width: 8,
    height: 8,
    borderRadius: 6,
    backgroundColor: theme.colors.text,
  },
}));
