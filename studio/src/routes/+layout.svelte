<script>
  import './styles.css';

  let styles = {
    background: ['#0f0f0f', '#111111', '#292929', '#414141', '#585858'],
    paper: '#212121',
    text: ['#ffffff', '#fdfdfd', '#e4e4e4', '#cacaca', '#b1b1b1'],

    divider: '#222222',

    primary: ['#008d53', '#009d5c', '#19a76c', '#33b17d'],
    secondary: ['#009cd7', '#00adef', '#19b5f1', '#33bdf2'],
    info: ['#dd8317', '#f5911a', '#f69c31', '#f7a748', ],
    success: ['#00b028', '#00c42c', '#19ca41', '#33d056', '#4dd66b', '#66dc80'],
    warning: ['#e5b800', '#fecc00', '#fed119', '#fed633'],
    'warning-darker': ['#cba300', '#b28f00', '#987a00', '#7f6600', '#665200', '#4c3d00'],
    danger: '#ff0b4b',
  };

  $: cssVarStyles = Object.entries(styles)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((v, i) => `--${key}-${i}: ${v};`).join('');
      }
      return `--${key}: ${value};`;
    })
    .join(';');
</script>

<div class="wrapper" style={cssVarStyles}>
  <slot />
  <footer />
</div>

<style>
  .wrapper {
    background-color: var(--background-1);
    min-height: 100vh;
    min-width: 100vw;
    color: var(--text-1);
  }
</style>
