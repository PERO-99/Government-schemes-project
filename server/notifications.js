function nowIso() {
  return new Date().toISOString();
}

function makeNotification({ type, title, message, schemeId = null, severity = 'info' }) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type, // profile_reminder | scheme_update | deadline | recommendation
    title,
    message,
    schemeId,
    severity, // info | warn | danger | success
    createdAt: nowIso(),
  };
}

function generateNotification({ profile, schemes }) {
  if (!profile || Object.keys(profile).length === 0) {
    return makeNotification({
      type: 'profile_reminder',
      title: 'Complete your profile',
      message: 'Add your state, income, and rural/urban to get accurate eligibility checks.',
      severity: 'warn',
    });
  }

  const scheme = schemes[Math.floor(Math.random() * schemes.length)];
  if (!scheme) {
    return makeNotification({
      type: 'scheme_update',
      title: 'New schemes available',
      message: 'We have refreshed scheme data. Try searching again.',
      severity: 'info',
    });
  }

  return makeNotification({
    type: 'recommendation',
    title: 'Suggested for you',
    message: `Based on your profile, check: ${scheme.title}`,
    schemeId: scheme.id,
    severity: 'success',
  });
}

module.exports = {
  makeNotification,
  generateNotification,
};
