// Click any element and get its XPath
document.addEventListener('click', function(e) {
    e.preventDefault();
    console.log(getXPath(e.target));
  }, { once: false });