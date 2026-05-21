/* ============================================================
   hubspot.js - Capture des leads vers HubSpot Forms API v3
   ------------------------------------------------------------
   Portail HubSpot connecte : 148295368

   A completer dans HubSpot > Marketing > Forms > Share / Embed :
   - diagnostic : formulaire long de demande de diagnostic
   - newsletter : formulaire court veille / analyses / prospects

   Les formulaires restent utilisables sans GUID :
   - le formulaire diagnostic ouvre un email prerempli ;
   - les formulaires newsletter redirigent vers contact.html avec prefill.
   ============================================================ */

const HUBSPOT_CONFIG = {
  defaultPortalId: '148295368',
  forms: {
    diagnostic: {
      portalId: '148295368',
      formId: 'YOUR_DIAGNOSTIC_FORM_GUID',
    },
    newsletter: {
      portalId: '148475561',
      formId: 'fd5d5483-a517-4bf3-bc24-902ca0a1b20f',
    },
  },
  // Optionnel : renseigner un ID d'abonnement HubSpot si une subscription marketing existe.
  newsletterSubscriptionTypeId: null,
};

(function () {
  const CONTACT_EMAIL = 'david@davidmlandau.com';
  const PLACEHOLDER_PREFIX = 'YOUR_';

  function isConfigured(formKey) {
    const formConfig = HUBSPOT_CONFIG.forms[formKey] || {};
    return Boolean(formConfig.portalId && formConfig.formId && formConfig.formId.indexOf(PLACEHOLDER_PREFIX) !== 0);
  }

  function endpoint(formKey) {
    const formConfig = HUBSPOT_CONFIG.forms[formKey] || {};
    return 'https://api.hsforms.com/submissions/v3/integration/submit/' +
      encodeURIComponent(formConfig.portalId || HUBSPOT_CONFIG.defaultPortalId) + '/' +
      encodeURIComponent(formConfig.formId);
  }

  function value(form, name) {
    const el = form.elements[name];
    return el ? String(el.value || '').trim() : '';
  }

  function field(form, name) {
    const el = form.elements[name];
    if (!el) return null;
    return { name: name, value: String(el.value || '').trim() };
  }

  function propertyField(name, rawValue) {
    const cleanValue = String(rawValue || '').trim();
    return cleanValue ? { name: name, value: cleanValue } : null;
  }

  function compactFields(fields) {
    return fields.filter(function (item) {
      return item && item.value !== '';
    });
  }

  function consentOptions(formKey) {
    const base = {
      consent: {
        consentToProcess: true,
        text: 'I agree to allow David Landau to store and process my personal data.',
      },
    };

    if (formKey === 'newsletter' && HUBSPOT_CONFIG.newsletterSubscriptionTypeId) {
      base.consent.communications = [{
        value: true,
        subscriptionTypeId: HUBSPOT_CONFIG.newsletterSubscriptionTypeId,
        text: 'I agree to receive marketing communications from David Landau.',
      }];
    }

    return base;
  }

  async function submitToHubSpot(formKey, fields) {
    const payload = {
      submittedAt: Date.now(),
      fields: fields,
      context: {
        pageUri: window.location.href,
        pageName: document.title,
      },
      legalConsentOptions: consentOptions(formKey),
    };

    const res = await fetch(endpoint(formKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[HubSpot] HTTP ' + res.status, body);
      throw new Error('HubSpot submission failed: HTTP ' + res.status);
    }

    return res.json().catch(function () { return {}; });
  }

  function subjectLabel(form) {
    const select = form.elements.subject;
    const selected = value(form, 'subject');
    if (!select) return selected || 'Diagnostic';

    const option = Array.prototype.find.call(select.options, function (item) {
      return item.value === selected;
    });
    return option ? option.textContent.trim() : (selected || 'Diagnostic');
  }

  function buildEmailBody(form) {
    return [
      'Nouvelle demande de diagnostic depuis davidmlandau.com',
      '',
      'Prenom: ' + value(form, 'firstname'),
      'Nom: ' + value(form, 'lastname'),
      'Email: ' + value(form, 'email'),
      'Societe: ' + value(form, 'company'),
      'Telephone: ' + value(form, 'phone'),
      'Secteur: ' + value(form, 'sector'),
      'Horizon: ' + value(form, 'timeline'),
      'Enjeu prioritaire: ' + subjectLabel(form),
      '',
      'Message:',
      value(form, 'message'),
      '',
      'Page source: ' + window.location.href
    ].join('\n');
  }

  function buildDiagnosticMessage(form) {
    return [
      'Enjeu prioritaire: ' + subjectLabel(form),
      'Secteur: ' + value(form, 'sector'),
      'Horizon: ' + value(form, 'timeline'),
      '',
      value(form, 'message')
    ].join('\n').trim();
  }

  function openMailClient(form) {
    const requester = [value(form, 'firstname'), value(form, 'lastname')].filter(Boolean).join(' ');
    const subjectParts = ['Demande de diagnostic', subjectLabel(form), value(form, 'company'), requester].filter(Boolean);
    window.location.href = 'mailto:' + CONTACT_EMAIL +
      '?subject=' + encodeURIComponent(subjectParts.join(' - ')) +
      '&body=' + encodeURIComponent(buildEmailBody(form));
  }

  function applyQueryPrefill(form) {
    const params = new URLSearchParams(window.location.search);
    ['email', 'company', 'subject', 'message', 'firstname', 'lastname', 'phone', 'sector', 'timeline'].forEach(function (name) {
      const incoming = params.get(name);
      const el = form.elements[name];
      if (incoming && el) el.value = incoming;
    });

    if (params.get('subject') === 'watch' && form.elements.message && !form.elements.message.value.trim()) {
      form.elements.message.value = (window.t && window.t('contact.watch.prefill')) ||
        'Je souhaite recevoir la veille mensuelle ingredients.';
    }
  }

  function setButtonLoading(button, label, isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    if (label) {
      label.textContent = isLoading
        ? ((window.t && window.t('contact.sending')) || 'Envoi en cours...')
        : label.dataset.defaultLabel;
    }
  }

  function setupContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    const submitLabel = submitBtn ? submitBtn.querySelector('[data-i18n="contact.send"]') : null;
    const successBlock = document.getElementById('form-success');
    const errorBlock = document.getElementById('form-error');

    if (submitLabel) submitLabel.dataset.defaultLabel = submitLabel.textContent;
    applyQueryPrefill(form);

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (errorBlock) errorBlock.hidden = true;

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (!isConfigured('diagnostic')) {
        console.warn('[HubSpot] Formulaire diagnostic non configure. Ouverture email.');
        openMailClient(form);
        if (successBlock) {
          successBlock.textContent = (window.t && window.t('contact.mailto_notice')) ||
            'Votre client email va s ouvrir avec le message prepare. Il reste a envoyer l email pour finaliser la demande. Vos donnees sont traitees dans le respect du RGPD et ne sont pas partagees avec des tiers.';
          successBlock.hidden = false;
          successBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      const fields = compactFields([
        field(form, 'firstname'),
        field(form, 'lastname'),
        field(form, 'email'),
        field(form, 'company'),
        field(form, 'phone'),
        propertyField('industry', value(form, 'sector')),
        propertyField('message', buildDiagnosticMessage(form)),
        propertyField('lifecyclestage', 'lead'),
      ]);

      setButtonLoading(submitBtn, submitLabel, true);
      try {
        await submitToHubSpot('diagnostic', fields);
        form.hidden = true;
        if (successBlock) {
          successBlock.hidden = false;
          successBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch (err) {
        console.error('[HubSpot] Echec de la soumission diagnostic', err);
        if (errorBlock) {
          errorBlock.hidden = false;
          errorBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } finally {
        setButtonLoading(submitBtn, submitLabel, false);
      }
    });
  }

  function fallbackToContact(form) {
    const params = new URLSearchParams();
    params.set('subject', value(form, 'subject') || 'watch');
    if (value(form, 'message')) params.set('message', value(form, 'message'));
    if (value(form, 'email')) params.set('email', value(form, 'email'));
    if (value(form, 'company')) params.set('company', value(form, 'company'));
    window.location.href = 'contact.html?' + params.toString() + '#diagnostic';
  }

  function showInlineStatus(form, text, isError) {
    const status = document.createElement('p');
    status.className = isError ? 'form-error' : 'form-success';
    status.textContent = text;
    form.replaceWith(status);
  }

  function setupLeadForms() {
    document.querySelectorAll('[data-hubspot-form="newsletter"]').forEach(function (form) {
      form.addEventListener('submit', async function (event) {
        event.preventDefault();

        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        if (!isConfigured('newsletter')) {
          console.warn('[HubSpot] Formulaire newsletter non configure. Redirection vers contact.');
          fallbackToContact(form);
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const label = submitBtn || null;
        const defaultLabel = submitBtn ? submitBtn.textContent : '';

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = (window.t && window.t('contact.sending')) || 'Envoi en cours...';
        }

        const fields = compactFields([
          field(form, 'email'),
          field(form, 'company'),
          field(form, 'message'),
          propertyField('lifecyclestage', 'lead'),
        ]);

        try {
          await submitToHubSpot('newsletter', fields);
          showInlineStatus(form, (window.t && window.t('contact.success')) ||
            'Merci, votre demande est bien enregistree.', false);
        } catch (err) {
          console.error('[HubSpot] Echec de la soumission newsletter', err);
          showInlineStatus(form, (window.t && window.t('contact.error')) ||
            'Une erreur est survenue. Merci de reessayer ou d ecrire directement a david@davidmlandau.com.', true);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            if (label) label.textContent = defaultLabel;
          }
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupContactForm();
    setupLeadForms();
  });
})();
