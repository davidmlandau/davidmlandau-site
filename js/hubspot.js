/* ============================================================
   hubspot.js — Soumission du formulaire de contact a HubSpot
   ------------------------------------------------------------
   CONFIGURATION REQUISE : remplacer PORTAL_ID et FORM_GUID
   ci-dessous par les valeurs trouvees dans HubSpot :

     HubSpot > Marketing > Forms > [votre formulaire] > Share
       URL d'embed contient `/v2/forms?portalId=XXXX&formId=YYYY`
       => PORTAL_ID = XXXX
       => FORM_GUID = YYYY

   Champs HubSpot par defaut deja mappes :
   firstname, lastname, email, company, phone, message, subject

   API utilisee : Forms Submissions v3 (gratuit, sans authentification).
   Doc : https://developers.hubspot.com/docs/api/marketing/forms
   ============================================================ */

const HUBSPOT_PORTAL_ID = 'YOUR_PORTAL_ID';     // ex : '12345678'
const HUBSPOT_FORM_GUID = 'YOUR_FORM_GUID';     // ex : '8a6f43c0-1234-abcd-...'

(function () {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const submitLabel = submitBtn ? submitBtn.querySelector('[data-i18n="contact.send"]') : null;
  const successBlock = document.getElementById('form-success');
  const errorBlock   = document.getElementById('form-error');

  function setLoading(state) {
    if (!submitBtn) return;
    submitBtn.disabled = state;
    if (submitLabel && state) {
      submitLabel.textContent = (window.t && window.t('contact.sending')) || 'Sending...';
    } else if (submitLabel) {
      submitLabel.textContent = (window.t && window.t('contact.send')) || 'Send the message';
    }
  }

  function showSuccess() {
    form.hidden = true;
    if (successBlock) {
      successBlock.hidden = false;
      successBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function showError() {
    if (errorBlock) {
      errorBlock.hidden = false;
      errorBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function fieldValue(name) {
    const el = form.elements[name];
    return el ? String(el.value || '').trim() : '';
  }

  function applyQueryPrefill() {
    const params = new URLSearchParams(window.location.search);
    ['email', 'company', 'subject', 'message', 'firstname', 'lastname', 'phone', 'sector', 'timeline'].forEach(function (name) {
      const value = params.get(name);
      const el = form.elements[name];
      if (!value || !el) return;
      el.value = value;
    });
    if (params.get('subject') === 'watch' && form.elements.message && !form.elements.message.value.trim()) {
      form.elements.message.value = (window.t && window.t('contact.watch.prefill')) ||
        'Je souhaite recevoir la veille mensuelle ingrédients.';
    }
  }

  function subjectLabel(value) {
    const select = form.elements.subject;
    if (!select) return value || 'Diagnostic';
    const option = Array.prototype.find.call(select.options, function (item) {
      return item.value === value;
    });
    return option ? option.textContent.trim() : (value || 'Diagnostic');
  }

  function buildEmailBody() {
    const lines = [
      'Nouvelle demande de diagnostic depuis davidmlandau.com',
      '',
      'Prenom: ' + fieldValue('firstname'),
      'Nom: ' + fieldValue('lastname'),
      'Email: ' + fieldValue('email'),
      'Societe: ' + fieldValue('company'),
      'Telephone: ' + fieldValue('phone'),
      'Secteur: ' + fieldValue('sector'),
      'Horizon: ' + fieldValue('timeline'),
      'Enjeu prioritaire: ' + subjectLabel(fieldValue('subject')),
      '',
      'Message:',
      fieldValue('message'),
      '',
      'Page source: ' + window.location.href
    ];
    return lines.join('\n');
  }

  function openMailClient() {
    const requester = [fieldValue('firstname'), fieldValue('lastname')].filter(Boolean).join(' ');
    const subjectParts = ['Demande de diagnostic'];
    const selectedSubject = subjectLabel(fieldValue('subject'));
    if (selectedSubject) subjectParts.push(selectedSubject);
    if (fieldValue('company')) subjectParts.push(fieldValue('company'));
    if (requester) subjectParts.push(requester);

    const mailto = 'mailto:david@davidmlandau.com' +
      '?subject=' + encodeURIComponent(subjectParts.join(' - ')) +
      '&body=' + encodeURIComponent(buildEmailBody());

    window.location.href = mailto;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (errorBlock) errorBlock.hidden = true;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Construit le payload conforme a l'API HubSpot Forms v3
    const fields = ['firstname', 'lastname', 'email', 'company', 'phone', 'sector', 'timeline', 'subject', 'message']
      .map(function (name) {
        const el = form.elements[name];
        return el ? { name: name, value: el.value || '' } : null;
      })
      .filter(Boolean);

    const payload = {
      submittedAt: Date.now(),
      fields: fields,
      context: {
        pageUri: window.location.href,
        pageName: document.title,
      },
      legalConsentOptions: {
        consent: {
          consentToProcess: true,
          text: 'I agree to allow David Landau to store and process my personal data.',
          communications: [{
            value: true,
            subscriptionTypeId: 999,
            text: 'I agree to receive marketing communications from David Landau.'
          }]
        }
      }
    };

    // Si HubSpot n'est pas configure, on ne simule plus un succes silencieux :
    // on ouvre un email prerempli vers l'adresse de contact.
    if (HUBSPOT_PORTAL_ID === 'YOUR_PORTAL_ID' || HUBSPOT_FORM_GUID === 'YOUR_FORM_GUID') {
      console.warn('[Contact] HubSpot non configure. Ouverture email vers david@davidmlandau.com.');
      openMailClient();
      if (successBlock) {
        successBlock.textContent = (window.t && window.t('contact.mailto_notice')) ||
          'Votre client email va s’ouvrir avec le message préparé. Il reste à envoyer l’email pour finaliser la demande.';
        successBlock.hidden = false;
        successBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setLoading(true);
    try {
      const url = 'https://api.hsforms.com/submissions/v3/integration/submit/' +
                  encodeURIComponent(HUBSPOT_PORTAL_ID) + '/' + encodeURIComponent(HUBSPOT_FORM_GUID);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('[HubSpot] HTTP ' + res.status, errText);
        throw new Error('HTTP ' + res.status);
      }
      // HubSpot renvoie 200 + body { inlineMessage } ou redirectUri
      showSuccess();
    } catch (err) {
      console.error('[HubSpot] Echec de la soumission', err);
      showError();
    } finally {
      setLoading(false);
    }
  });

  applyQueryPrefill();
})();
