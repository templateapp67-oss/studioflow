const swatches = document.querySelectorAll('.sw[data-shade-image]');
const image = document.getElementById('shadeImg');
const name = document.getElementById('shadeName');
const price = document.getElementById('shadePrice');
const blurb = document.getElementById('shadeBlurb');

for (const swatch of swatches) {
  swatch.addEventListener('click', () => {
    image.src = swatch.dataset.shadeImage;
    name.textContent = swatch.getAttribute('aria-label');
    price.textContent = swatch.dataset.shadePrice;
    blurb.textContent = swatch.dataset.shadeBlurb;
    for (const option of swatches) {
      const selected = option === swatch;
      option.classList.toggle('on', selected);
      option.setAttribute('aria-pressed', String(selected));
    }
  });
}
