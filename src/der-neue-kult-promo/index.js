const $form = document.getElementById('form');
const $preview = document.getElementById('preview');
const $password = document.getElementById('password');

$form.addEventListener('submit', e => {
  e.preventDefault();

  // yes, it's fake secret! ^.^
  if ($password.value === window._phrase) {
    $form.style.display = 'none';
    $preview.style.display = 'block';
  }
});
