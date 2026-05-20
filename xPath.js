function getXPath(element) {
    const TEXT_FRIENDLY_TAGS = [
      'a',
      'button',
      'label',
      'option',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'th',
      'legend',
      'span',
      'li',
      'dt',
      'dd',
      'summary',
      'strong',
      'em',
      'b',
      'i',
      'u',
      'caption',
      'figcaption'
    ];

    const INPUT_TAGS = [
      'input',
      'textarea',
      'select'
    ];

    const STABLE_NAMED_ATTRS = [
      'name',
      'aria-label',
      'placeholder',
      'title',
      'role'
    ];

    const HREF_TAGS = ['a', 'area', 'link'];

    if (!(element instanceof Element)) {
      throw new TypeError('getXPath: argument must be an Element');
    }

    if (element === document.documentElement) {
      return '/html';
    }

    if (element === document.body) {
      return '/html/body';
    }

    function escapeXPathString(str) {
      if (!str.includes('"')) {
        return `"${str}"`;
      }

      if (!str.includes("'")) {
        return `'${str}'`;
      }

      return (
        'concat("' +
        str.replace(/"/g, '", \'"\', "') +
        '")'
      );
    }

    function uniquelySelects(xpath, target) {
      try {
        const result = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );

        return (
          result.snapshotLength === 1 &&
          result.snapshotItem(0) === target
        );
      } catch {
        return false;
      }
    }

    function countMatches(xpath) {
      try {
        const result = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        return result.snapshotLength;
      } catch {
        return 0;
      }
    }

    function isStableId(id) {
      if (/\d{4,}/.test(id)) return false;
      if (id.length > 30) return false;
      return true;
    }

    function isStableClass(cls) {
      if (/^css-[a-z0-9]+$/i.test(cls)) return false;
      if (/^sc-[a-zA-Z0-9]+$/.test(cls)) return false;
      if (/^jsx-\d+$/.test(cls)) return false;
      if (/[0-9]{4,}/.test(cls)) return false;
      return true;
    }

    function normalizeText(text) {
      return text
        .replace(/^[\u0020\t\n\r]+|[\u0020\t\n\r]+$/g, '')
        .replace(/[\u0020\t\n\r]+/g, ' ');
    }

    function isUsefulHref(href) {
      if (!href) return false;
      if (href === '#') return false;
      if (href.toLowerCase().startsWith('javascript:')) return false;
      return true;
    }

    function collectPredicates(el) {
      const predicates = [];
      const elTag = el.tagName.toLowerCase();

      if (el.id && isStableId(el.id)) {
        predicates.push(`[@id=${escapeXPathString(el.id)}]`);
      }

      if (TEXT_FRIENDLY_TAGS.includes(elTag)) {
        const text = normalizeText(el.textContent || '');
        if (text && text.length <= 100) {
          const escaped = escapeXPathString(text);
          predicates.push(`[normalize-space()=${escaped}]`);
          predicates.push(`[contains(normalize-space(), ${escaped})]`);
        }
      }

      for (const attr of STABLE_NAMED_ATTRS) {
        const value = el.getAttribute(attr);
        if (!value) continue;
        predicates.push(`[@${attr}=${escapeXPathString(value)}]`);
      }

      for (const a of el.attributes || []) {
        if (!a.name.startsWith('data-')) continue;
        if (!a.value) continue;
        predicates.push(`[@${a.name}=${escapeXPathString(a.value)}]`);
      }

      if (HREF_TAGS.includes(elTag)) {
        const href = el.getAttribute('href');
        if (isUsefulHref(href)) {
          predicates.push(`[@href=${escapeXPathString(href)}]`);
        }
      }

      for (const cls of el.classList) {
        if (!isStableClass(cls)) continue;
        predicates.push(
          `[contains(concat(" ", normalize-space(@class), " "), " ${cls} ")]`
        );
      }

      return predicates;
    }

    function combineAnd(predA, predB) {
      const inner = (p) => p.replace(/^\[/, '').replace(/\]$/, '');
      return `[${inner(predA)} and ${inner(predB)}]`;
    }

    function findAncestorAnchor(el) {
      let ancestor = el.parentElement;
      let depth = 0;
      while (ancestor && ancestor !== document.body && depth < 8) {
        const ancestorTag = ancestor.tagName.toLowerCase();
        for (const pred of collectPredicates(ancestor)) {
          const ancestorXPath = `//${ancestorTag}${pred}`;
          if (countMatches(ancestorXPath) === 1) {
            return ancestorXPath;
          }
        }
        ancestor = ancestor.parentElement;
        depth++;
      }
      return null;
    }

    function indexAmongDescendants(ancestorXPath, target, tag) {
      try {
        const result = document.evaluate(
          `${ancestorXPath}//${tag}`,
          document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        for (let i = 0; i < result.snapshotLength; i++) {
          if (result.snapshotItem(i) === target) return i + 1;
        }
      } catch {
      }
      return -1;
    }

    const tag = element.tagName.toLowerCase();

    if (element.id && isStableId(element.id)) {
      const xpath = `//*[@id="${element.id}"]`;

      if (uniquelySelects(xpath, element)) {
        return xpath;
      }
    }

    const elementPredicates = collectPredicates(element);

    for (const pred of elementPredicates) {
      const xpath = `//${tag}${pred}`;
      if (uniquelySelects(xpath, element)) {
        return xpath;
      }
    }

    if (INPUT_TAGS.includes(tag)) {
      if (element.id) {
        const label = document.querySelector(
          `label[for="${element.id}"]`
        );

        if (label) {
          const labelText = normalizeText(
            label.textContent || ''
          );

          if (labelText) {
            const escaped =
              escapeXPathString(labelText);

            const xpath =
              `//label[normalize-space()=${escaped}]` +
              `/following-sibling::${tag}[1]`;

            if (uniquelySelects(xpath, element)) {
              return xpath;
            }
          }
        }
      }

      const parentLabel = element.closest('label');

      if (parentLabel) {
        const labelText = normalizeText(
          parentLabel.textContent || ''
        );

        if (labelText) {
          const escaped =
            escapeXPathString(labelText);

          const xpath =
            `//label[normalize-space()=${escaped}]//${tag}[1]`;

          if (uniquelySelects(xpath, element)) {
            return xpath;
          }
        }
      }
    }

    for (let i = 0; i < elementPredicates.length; i++) {
      for (let j = i + 1; j < elementPredicates.length; j++) {
        const xpath =
          `//${tag}${combineAnd(elementPredicates[i], elementPredicates[j])}`;

        if (uniquelySelects(xpath, element)) {
          return xpath;
        }
      }
    }

    const anchor = findAncestorAnchor(element);

    if (anchor) {
      for (const pred of elementPredicates) {
        const xpath = `${anchor}//${tag}${pred}`;
        if (uniquelySelects(xpath, element)) {
          return xpath;
        }
      }

      const idx = indexAmongDescendants(anchor, element, tag);
      if (idx > 0) {
        const xpath = `${anchor}//${tag}[${idx}]`;
        if (uniquelySelects(xpath, element)) {
          return xpath;
        }
      }
    }

    let current = element;
    const parts = [];

    while (
      current &&
      current.nodeType === Node.ELEMENT_NODE
    ) {
      const currentTag =
        current.tagName.toLowerCase();

      let index = 1;

      let sibling =
        current.previousElementSibling;

      while (sibling) {
        if (sibling.tagName === current.tagName) {
          index++;
        }

        sibling = sibling.previousElementSibling;
      }

      parts.unshift(`${currentTag}[${index}]`);

      const absoluteXpath = '/' + parts.join('/');
      if (uniquelySelects(absoluteXpath, element)) {
        return absoluteXpath;
      }

      const descendantXpath = '//' + parts.join('/');
      if (uniquelySelects(descendantXpath, element)) {
        return descendantXpath;
      }

      current = current.parentElement;
    }

    return '/' + parts.join('/');
  }