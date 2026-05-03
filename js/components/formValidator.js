/**
 * Form validator.
 * Usage:
 *   const v = new FormValidator(formEl, rules, lang)
 *   v.validate() → Promise<{name, email, ...}> or rejects
 *   Auto-validates on blur; full validation on submit.
 *
 * Rule format per field:
 *   { required, minLength, maxLength, pattern, minDate, errorMessage: { vi, en } }
 */

const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^0\d{9}$/
};

export class FormValidator {
  constructor(form, rules, lang = 'vi') {
    this.form  = form;
    this.rules = rules;
    this.lang  = lang;
    this._bindBlur();
  }

  setLang(lang) { this.lang = lang; }

  _bindBlur() {
    Object.keys(this.rules).forEach(name => {
      const el = this.form.elements[name];
      if (!el) return;
      el.addEventListener('blur', () => this._validateField(name, el.value));
    });
  }

  _validateField(name, value) {
    const rule = this.rules[name];
    const field = this.form.elements[name]?.closest('.field');
    const errEl = field?.querySelector('.field__error');

    const error = this._check(name, value, rule);

    if (field) {
      field.classList.toggle('field--error', !!error);
      field.classList.toggle('field--success', !error && value.trim() !== '');
    }
    if (errEl) errEl.textContent = error || '';

    return !error;
  }

  _check(name, value, rule) {
    const v = (value || '').trim();

    if (rule.required && !v) {
      return (rule.errorMessage?.[this.lang]) || (this.lang === 'vi' ? 'Trường này là bắt buộc' : 'This field is required');
    }
    if (!v) return null;

    if (rule.minLength && v.length < rule.minLength) {
      return (rule.errorMessage?.[this.lang]) || `Tối thiểu ${rule.minLength} ký tự`;
    }

    if (rule.pattern) {
      const regex = typeof rule.pattern === 'string' ? PATTERNS[rule.pattern] : rule.pattern;
      if (regex && !regex.test(v)) {
        return (rule.errorMessage?.[this.lang]) || (this.lang === 'vi' ? 'Giá trị không hợp lệ' : 'Invalid value');
      }
    }

    if (rule.minDate === 'tomorrow') {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0,0,0,0);
      if (new Date(v) < tomorrow) {
        return (rule.errorMessage?.[this.lang]) || (this.lang === 'vi' ? 'Vui lòng chọn ngày trong tương lai' : 'Please select a future date');
      }
    }

    return null;
  }

  validate() {
    const data = {};
    let valid = true;

    Object.keys(this.rules).forEach(name => {
      const el = this.form.elements[name];
      if (!el) return;
      const ok = this._validateField(name, el.value);
      if (!ok) valid = false;
      else data[name] = el.value.trim();
    });

    if (!valid) return Promise.reject(new Error('Validation failed'));
    return Promise.resolve(data);
  }

  reset() {
    Object.keys(this.rules).forEach(name => {
      const field = this.form.elements[name]?.closest('.field');
      if (field) {
        field.classList.remove('field--error', 'field--success');
        const errEl = field.querySelector('.field__error');
        if (errEl) errEl.textContent = '';
      }
    });
    this.form.reset();
  }
}
