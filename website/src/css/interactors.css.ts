import { globalStyle, style } from "@vanilla-extract/css";
import vars, {
  laptopQuery,
} from "./frontside-theme.css";

export const heroCode = style([{
  textAlign: 'left',
  marginTop: vars.space.md,
  '@media': {
    [laptopQuery]: {
      flexShrink: 0,
      width: '50%',
      marginTop: 0,
    }
  }
}]);

globalStyle(`${heroCode} .tabs-container .tabs`, {
  marginBottom: 0,
});

globalStyle(`${heroCode} .tabs__item`, {
  borderRadius: 'var(--ifm-global-radius)',
  padding: vars.space.sm,
  paddingTop: vars.space['2xs'],
  paddingBottom: vars.space['2xs'],
});

globalStyle(`${heroCode} pre`, {
  fontSize: vars.fontSize.sm,
  lineHeight: vars.lineHeights.base,
});


globalStyle(`${heroCode} .maybe-class-name`, {
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  display: 'inline-block',
  fontWeight: vars.fontWeights.extrabold,
  backgroundImage: `linear-gradient(90deg, ${vars.colors.pink} -20%, ${vars.colors.purple} 95%)`,
});
