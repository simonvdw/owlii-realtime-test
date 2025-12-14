const loginView = document.getElementById("loginView");
const adminPanel = document.getElementById("adminPanel");
const adminStatus = document.getElementById("adminStatus");
const loginForm = document.getElementById("loginForm");
const logoutButton = document.getElementById("logoutButton");

const categorySelect = document.getElementById("categorySelect");
const subcategorySelect = document.getElementById("subcategorySelect");
const newCategoryInput = document.getElementById("newCategoryInput");
const newSubcategoryInput = document.getElementById("newSubcategoryInput");
const createCategoryButton = document.getElementById("createCategoryButton");
const createSubcategoryButton = document.getElementById("createSubcategoryButton");

const studioTypeSelect = document.getElementById("studioType");
const studioPrompt = document.getElementById("studioPrompt");
const studioTitle = document.getElementById("studioTitle");
const studioText = document.getElementById("studioText");
const generateTextButton = document.getElementById("generateTextButton");
const createAudioButton = document.getElementById("createAudioButton");
const studioMessage = document.getElementById("studioMessage");
const voiceSelect = document.getElementById("voiceSelect");

const filterName = document.getElementById("filterName");
const filterAge = document.getElementById("filterAge");
const filterFrom = document.getElementById("filterFrom");
const filterTo = document.getElementById("filterTo");
const filterSummary = document.getElementById("filterSummary");
const filterLogsButton = document.getElementById("filterLogsButton");
const logsList = document.getElementById("logsList");

const state = {
  categories: []
};

categorySelect?.addEventListener("change", () => {
  populateSubcategories();
});

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "include",
    ...options
  });
  if (!response.ok) {
    let message = "Onbekende fout";
    try {
      const data = await response.json();
      message = data.error || message;
    } catch (_) {
      message = await response.text();
    }
    throw new Error(message || response.statusText);
  }
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

function toggleView(isAuthenticated) {
  if (isAuthenticated) {
    loginView.hidden = true;
    adminPanel.hidden = false;
    adminStatus.textContent = "Je bent ingelogd als admin.";
    loadCategories();
    loadLogs();
  } else {
    loginView.hidden = false;
    adminPanel.hidden = true;
    adminStatus.textContent = "Log in om admin functies te gebruiken.";
  }
}

async function checkSession() {
  try {
    const data = await request("/api/admin/session", { method: "GET", headers: {} });
    toggleView(Boolean(data.authenticated));
  } catch (err) {
    console.error(err);
    toggleView(false);
  }
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = document.getElementById("adminUser").value.trim();
  const password = document.getElementById("adminPass").value.trim();
  try {
    await request("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
    toggleView(true);
  } catch (err) {
    alert(`Login mislukt: ${err.message}`);
  }
});

logoutButton?.addEventListener("click", async () => {
  await request("/api/admin/logout", { method: "POST" });
  toggleView(false);
});

async function loadCategories() {
  try {
    const data = await request("/api/admin/categories", { method: "GET" });
    state.categories = data.categories || [];
    renderCategoryOptions();
  } catch (err) {
    console.error("Kon categorieën niet laden", err);
  }
}

function renderCategoryOptions() {
  const defaultOption = '<option value="">Kies een categorie</option>';
  categorySelect.innerHTML = defaultOption;
  subcategorySelect.innerHTML = '<option value="">Kies een subcategorie</option>';

  state.categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.id;
    option.textContent = cat.name;
    categorySelect.appendChild(option);
  });

  populateSubcategories();
}

function populateSubcategories() {
  subcategorySelect.innerHTML = '<option value="">Kies een subcategorie</option>';
  const selectedId = Number(categorySelect.value);
  if (!selectedId) return;
  const category = state.categories.find((c) => c.id === selectedId);
  if (!category) return;
  (category.subcategories || []).forEach((sub) => {
    const option = document.createElement("option");
    option.value = sub.id;
    option.textContent = sub.name;
    subcategorySelect.appendChild(option);
  });
}

createCategoryButton?.addEventListener("click", async () => {
  const name = newCategoryInput.value.trim();
  if (!name) return;
  try {
    await request("/api/admin/categories", {
      method: "POST",
      body: JSON.stringify({ name })
    });
    newCategoryInput.value = "";
    loadCategories();
  } catch (err) {
    alert(err.message);
  }
});

createSubcategoryButton?.addEventListener("click", async () => {
  const name = newSubcategoryInput.value.trim();
  const parentId = categorySelect.value;
  if (!name || !parentId) {
    alert("Kies eerst een hoofdcategorie en geef een naam.");
    return;
  }
  try {
    await request(`/api/admin/categories/${parentId}/subcategories`, {
      method: "POST",
      body: JSON.stringify({ name })
    });
    newSubcategoryInput.value = "";
    loadCategories();
  } catch (err) {
    alert(err.message);
  }
});

generateTextButton?.addEventListener("click", async () => {
  const prompt = studioPrompt.value.trim();
  const entryType = studioTypeSelect.value;
  if (!prompt) {
    alert("Geef eerst een prompt in.");
    return;
  }
  generateTextButton.disabled = true;
  generateTextButton.textContent = "Bezig...";
  try {
    const { text } = await request("/api/admin/studio/draft", {
      method: "POST",
      body: JSON.stringify({ prompt, entryType })
    });
    studioText.value = text || "";
    studioMessage.textContent = "Tekst gegenereerd, bewerk gerust verder.";
  } catch (err) {
    studioMessage.textContent = err.message;
  } finally {
    generateTextButton.disabled = false;
    generateTextButton.textContent = "Genereer tekst";
  }
});

createAudioButton?.addEventListener("click", async () => {
  const contentText = studioText.value.trim();
  if (!contentText) {
    alert("Er is geen tekst om in te spreken.");
    return;
  }

  createAudioButton.disabled = true;
  createAudioButton.textContent = "Audio maken...";
  studioMessage.textContent = "Audio wordt aangemaakt...";

  try {
    const payload = {
      title: studioTitle.value,
      prompt: studioPrompt.value,
      contentText,
      entryType: studioTypeSelect.value,
      categoryId: categorySelect.value || null,
      subcategoryId: subcategorySelect.value || null,
      voice: voiceSelect.value
    };

    const { entry } = await request("/api/admin/studio/audio", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    studioMessage.textContent = `Audio opgeslagen: ${entry.audio_path}`;
  } catch (err) {
    studioMessage.textContent = err.message;
  } finally {
    createAudioButton.disabled = false;
    createAudioButton.textContent = "Maak geluidsbestand";
  }
});

filterLogsButton?.addEventListener("click", () => {
  loadLogs();
});

async function loadLogs() {
  const params = new URLSearchParams();
  if (filterName.value.trim()) params.append("firstName", filterName.value.trim());
  if (filterAge.value) params.append("age", filterAge.value);
  if (filterFrom.value) params.append("dateFrom", filterFrom.value);
  if (filterTo.value) params.append("dateTo", filterTo.value);
  if (filterSummary.value.trim()) params.append("summary", filterSummary.value.trim());

  try {
    const data = await request(`/api/admin/logs?${params.toString()}`, { method: "GET" });
    renderLogs(data.logs || []);
  } catch (err) {
    console.error(err);
    logsList.innerHTML = `<p>${err.message}</p>`;
  }
}

function renderLogs(logs) {
  if (!logs.length) {
    logsList.innerHTML = '<p class="status-text">Geen logs gevonden.</p>';
    return;
  }
  logsList.innerHTML = "";
  logs.forEach((log) => {
    const item = document.createElement("article");
    item.className = "log-item";
    const created = new Date(log.created_at).toLocaleString("nl-BE");
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.marginBottom = "0.5rem";
    header.style.gap = "0.5rem";

    const chipsContainer = document.createElement("div");
    const nameChip = document.createElement("span");
    nameChip.className = "chip";
    nameChip.textContent = log.first_name;
    chipsContainer.appendChild(nameChip);

    if (log.age) {
      const ageChip = document.createElement("span");
      ageChip.className = "chip";
      ageChip.textContent = `${log.age} jaar`;
      chipsContainer.appendChild(ageChip);
    }

    const dateSmall = document.createElement("small");
    dateSmall.textContent = created;

    header.appendChild(chipsContainer);
    header.appendChild(dateSmall);
    item.appendChild(header);

    const summaryList = document.createElement("ul");
    summaryList.style.margin = "0";
    summaryList.style.paddingLeft = "1.25rem";
    (log.summary || "")
      .split(/\n+/)
      .filter(Boolean)
      .forEach((line) => {
        const li = document.createElement("li");
        li.textContent = line;
        summaryList.appendChild(li);
      });
    item.appendChild(summaryList);
    logsList.appendChild(item);
  });
}

checkSession();
