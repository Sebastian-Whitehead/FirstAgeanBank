export async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(options.headers || {}) }
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The server returned an unexpected response. Please try again.');
  }
  if (!response.ok && !data.error) {
    throw new Error(data.message || 'The request could not be completed.');
  }
  return data;
}

export async function submitForm(url, form, submitName) {
  const formData = new FormData(form);
  formData.set(submitName, '1');
  return requestJson(url, { method: 'POST', body: formData });
}
