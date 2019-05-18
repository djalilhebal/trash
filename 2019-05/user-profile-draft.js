const profile = {
  data: {},
  newData: {},

  init() {
    const $profile = document.querySelector('#profile');
    const $form = $profile.querySelector('form');
    const $save = $profile.querySelector('input[type=submit]');
    const getFormObj = () => Object.fromEntries( [...(new FormData($form)).entries()] );

    profile.data = getFormObj(); // original info (as present in the database)
    const keys = Object.keys(profile.data); // caching kinda

    $form.onchange = (e) => {
      profile.newData = getFormObj();
      const changed = !!keys.find(key => profile.newData[key] !== profile.data[key]);
      if (changed) {
        profile.reformat();
        $save.removeAttribute('disabled');
      } else {
        $save.setAttribute('disabled', 'true');
      }
    }

    function save() {
      // Why check $save's attribute? To not recalculate the 'changed' variable.
      if ($save.hasAttribute('disabled')) {
        // Nothing has changed, do nothing.
        return false;
      }

      // Okay, some attributes were changed, check them before saving.
      // Only these attributes are changeable ('username', '_id', are not)
      const changeable = new Set(['gender', 'birthYear', 'wilayaCode', 'education', 'languages']);
      const formObj = getFormObj();
      const badKey = Object.keys(formObj).find(key => !changeable.has(key));
      if (badKey) {
        throw new Error('You are not allowed to change this field: ' + badKey);
      }

      // Reached this point? Everything seems good. Same the new data.
      profile.data = formObj;
      $save.setAttribute('disabled', 'true');
      return true;
    }

    $form.onsubmit = (e) => {
      e.preventDefault();
      save();
    }
  },

  reformat() {
    // age
    const currentYear = (new Date).getFullYear();
    const diff = currentYear - Number(profile.newData.birthYear);
    const ageText = `${diff}yo`;
  
    // languages
    const languagesText =
      profile.newData.languages
        .trim()
        .split(/,?\s+/)
        .map(Language.expandLang) // if find(str => str.startsWith('?')) show error
        .join(', ');
  
    const $profile = document.querySelector('#profile');
    const $ageInfo = $profile.querySelector('input[name=birthYear]').nextElementSibling;
    $ageInfo.innerHTML = `(${ageText})`;
    const $languagesInfo = $profile.querySelector('input[name=languages]').nextElementSibling;
    $languagesInfo.innerHTML = `(${languagesText})`;
  }
  
}

const Language = {
  ISO2: 'ar fr en jp ko'.split(' '),
  FULL: 'Arabic French English Japanese Korean'.split(' '),
  /**
   * @example
   * Language.expandLang('jp') === 'Japanese'
   * 
   * @param {string} str
   * @return {string} expanded name if found or its ISO code
   */
  expandLang(str) {
    const lang = str.toLowerCase();

    const rLang = /^[a-z]{2,}$/;
    if (!rLang.test(lang)) {
      return '?' + lang;
    }
  
    // The use used the language's ISO-2 code
    if (lang.length === 2) {
      const isoIndex = Language.ISO2.findIndex(xx => xx === lang);
      return isoIndex >= 0 ? Language.FULL[isoIndex] : lang.toUpperCase();
    }

    // Well, the user has probably entered the full name of the language
    const capitalized = lang[0].toUpperCase() + lang.slice(1);
    return capitalized;
  }
}

profile.init();
