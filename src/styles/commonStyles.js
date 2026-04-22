import { StyleSheet } from 'react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, ShadowStyles, Layout } from './theme';

export const commonStyles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  // Card styles
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...ShadowStyles.medium,
  },
  cardSmall: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...ShadowStyles.small,
  },
  cardLarge: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...ShadowStyles.large,
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginLeft: Spacing.md,
    flex: 1,
  },
  
  // Button styles
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...ShadowStyles.small,
  },
  buttonLarge: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...ShadowStyles.medium,
  },
  buttonSmall: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: Colors.textLight,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
  },
  buttonSecondary: {
    backgroundColor: Colors.input,
  },
  buttonDanger: {
    backgroundColor: Colors.error,
  },
  buttonSuccess: {
    backgroundColor: Colors.success,
  },
  
  // Input styles
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.lg,
    backgroundColor: Colors.input,
    color: Colors.text,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputFocused: {
    borderColor: Colors.primary,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
  },
  
  // Text styles
  text: {
    fontSize: FontSizes.lg,
    color: Colors.text,
  },
  textSmall: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  textSecondary: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
  },
  textTertiary: {
    fontSize: FontSizes.md,
    color: Colors.textTertiary,
  },
  textLight: {
    fontSize: FontSizes.lg,
    color: Colors.textLight,
  },
  textBold: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  textTitle: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  textSubtitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
  },
  
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  
  // Spacing helpers
  marginXs: { margin: Spacing.xs },
  marginSm: { margin: Spacing.sm },
  marginMd: { margin: Spacing.md },
  marginLg: { margin: Spacing.lg },
  marginXl: { margin: Spacing.xl },
  
  marginTopXs: { marginTop: Spacing.xs },
  marginTopSm: { marginTop: Spacing.sm },
  marginTopMd: { marginTop: Spacing.md },
  marginTopLg: { marginTop: Spacing.lg },
  marginTopXl: { marginTop: Spacing.xl },
  
  marginBottomXs: { marginBottom: Spacing.xs },
  marginBottomSm: { marginBottom: Spacing.sm },
  marginBottomMd: { marginBottom: Spacing.md },
  marginBottomLg: { marginBottom: Spacing.lg },
  marginBottomXl: { marginBottom: Spacing.xl },
  
  paddingXs: { padding: Spacing.xs },
  paddingSm: { padding: Spacing.sm },
  paddingMd: { padding: Spacing.md },
  paddingLg: { padding: Spacing.lg },
  paddingXl: { padding: Spacing.xl },
  
  paddingTopXs: { paddingTop: Spacing.xs },
  paddingTopSm: { paddingTop: Spacing.sm },
  paddingTopMd: { paddingTop: Spacing.md },
  paddingTopLg: { paddingTop: Spacing.lg },
  paddingTopXl: { paddingTop: Spacing.xl },
  
  paddingBottomXs: { paddingBottom: Spacing.xs },
  paddingBottomSm: { paddingBottom: Spacing.sm },
  paddingBottomMd: { paddingBottom: Spacing.md },
  paddingBottomLg: { paddingBottom: Spacing.lg },
  paddingBottomXl: { paddingBottom: Spacing.xl },
  
  // Flex helpers
  flexRow: {
    flexDirection: 'row',
  },
  flexColumn: {
    flexDirection: 'column',
  },
  flexCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  flexBetween: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flexStart: {
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  flexEnd: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  
  // Border helpers
  border: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  borderRounded: {
    borderRadius: BorderRadius.md,
  },
  borderCircular: {
    borderRadius: BorderRadius.full,
  },
  
  // Shadow helpers
  shadowSmall: ShadowStyles.small,
  shadowMedium: ShadowStyles.medium,
  shadowLarge: ShadowStyles.large,
  shadowExtraLarge: ShadowStyles.extraLarge,
  
  // Gradient background simulation
  gradientPrimary: {
    backgroundColor: Colors.primary,
  },
  gradientSecondary: {
    backgroundColor: Colors.secondary,
  },
});

export default commonStyles;
