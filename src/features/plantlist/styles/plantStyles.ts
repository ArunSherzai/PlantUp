import { StyleSheet } from 'react-native-unistyles';
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
    width: width - vw * 8,
    height: vh * 29,
    borderRadius: vw * 6,
    overflow: 'visible',
  },

  gradient: {
    flex: 1,
    borderRadius: vw * 6,
    padding: vw * 5,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },

  image: {
    width: vw * 26,
    height: vw * 26,
    marginRight: vw * 5,
    resizeMode: 'contain',
  },

  infoColumn: {
    flex: 1,
    justifyContent: 'center',
  },

  name: {
    fontSize: vw * 7,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.textDark,
    fontFamily: theme.fonts.regular,
  },

  points: {
    fontSize: vw * 3.5,
    color: theme.colors.typography,
    marginTop: vh * 0.5,
    opacity: 0.7,
  },

  plantCardActionButton: {
    position: 'absolute',
    top: vh * 1.2,
    right: vw * 3,
    padding: vw * 2,
    zIndex: 10,
  },

  backGradient: {
    flex: 1,
    borderRadius: vw * 6,
    padding: vw * 2,
  },

  backContent: {
    margin: vw * 4,
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
    marginBottom: vh * 1.5,
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
    borderRadius: vw * 2,
    paddingVertical: vh * 1,
    paddingHorizontal: vw * 3,
    color: theme.colors.text,
    fontSize: vw * 3.5,
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: vw * 2,
    width: '100%',
  },

  saveButton: {
    flex: 1, // Fill available space
    backgroundColor: theme.colors.primary,
    paddingVertical: vh * 1,
    borderRadius: vw * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButton: {
    flex: 1, // Fill available space
    backgroundColor: 'transparent',
    paddingVertical: vh * 1,
    borderRadius: vw * 2,
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
  iconsView: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: vw * 88,
    height: vh * 29,
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
