// DOM Elements
const loginView = document.getElementById("loginView");
const adminPanel = document.getElementById("adminPanel");
const adminNav = document.getElementById("adminNav");
const loginForm = document.getElementById("loginForm");
const logoutButton = document.getElementById("logoutButton");

// Studio elements (may not exist on all pages)
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
const studioEntriesList = document.getElementById("studioEntriesList");
const refreshEntriesButton = document.getElementById("refreshEntriesButton");

// Logs elements (may not exist on all pages)
const filterName = document.getElementById("filterName");
const filterAge = document.getElementById("filterAge");
const filterFrom = document.getElementById("filterFrom");
const filterTo = document.getElementById("filterTo");
const filterSummary = document.getElementById("filterSummary");
const filterLogsButton = document.getElementById("filterLogsButton");
const toggleAdvancedFilter = document.getElementById("toggleAdvancedFilter");
const advancedFilters = document.getElementById("advancedFilters");
const logsList = document.getElementById("logsList");

const state = {
  categories: []
};

// Get current route from server-rendered variable
const currentRoute = window.ADMIN_CURRENT_ROUTE || "home";

// Set active nav link
function updateNavActive() {
  document.querySelectorAll(".admin-nav .nav-link").forEach(link => {
    link.classList.toggle("active", link.dataset.route === currentRoute);
  });
}

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
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      message = data.error || message;
    } catch (_) {
      message = text || response.statusText;
    }
    throw new Error(message);
  }
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

function toggleView(isAuthenticated) {
  if (isAuthenticated) {
    loginView.style.display = "none";
    adminPanel.style.display = "block";
    adminNav.style.display = "flex";
    logoutButton.style.display = "inline-flex";

    // Update nav and load page-specific data
    updateNavActive();

    // Load data based on current route
    if (currentRoute === "studio") {
      loadCategories();
      loadStudioEntries();
    } else if (currentRoute === "logs") {
      loadLogs();
    } else if (currentRoute === "home") {
      loadLogs(10); // Show latest 10 on home
    }
  } else {
    loginView.style.display = "flex";
    adminPanel.style.display = "none";
    adminNav.style.display = "none";
    logoutButton.style.display = "none";
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
    loadStudioEntries(); // Refresh the list
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

// Enter key triggers search
filterSummary?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    loadLogs();
  }
});

toggleAdvancedFilter?.addEventListener("click", () => {
  const isHidden = advancedFilters.style.display === "none";
  advancedFilters.style.display = isHidden ? "block" : "none";
  toggleAdvancedFilter.textContent = isHidden ? "− Filters" : "+ Filters";
});

refreshEntriesButton?.addEventListener("click", () => {
  loadStudioEntries();
});

async function loadStudioEntries() {
  if (!studioEntriesList) return;

  studioEntriesList.innerHTML = '<p style="color: var(--admin-muted); text-align: center;">Laden...</p>';

  try {
    const data = await request("/api/admin/studio/entries", { method: "GET" });
    renderStudioEntries(data.entries || []);
  } catch (err) {
    console.error("Kon studio entries niet laden", err);
    studioEntriesList.innerHTML = `<p style="color: var(--admin-muted); text-align: center;">${err.message}</p>`;
  }
}

function renderStudioEntries(entries) {
  if (!entries.length) {
    studioEntriesList.innerHTML = '<p style="color: var(--admin-muted); text-align: center;">Nog geen audio gegenereerd.</p>';
    return;
  }

  studioEntriesList.innerHTML = "";

  entries.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "entry-item";

    const created = new Date(entry.created_at).toLocaleString("nl-BE");
    const title = entry.title || "Zonder titel";
    const type = entry.entry_type || "onbekend";

    item.innerHTML = `
      <div class="entry-header">
        <div class="entry-info">
          <strong>${title}</strong>
          <span class="chip small">${type}</span>
          ${entry.category_name ? `<span class="chip secondary small">${entry.category_name}</span>` : ""}
          ${entry.subcategory_name ? `<span class="chip secondary small">${entry.subcategory_name}</span>` : ""}
        </div>
        <span class="entry-date">${created}</span>
      </div>
      <div class="entry-controls">
        <audio controls src="${entry.audio_path}" preload="none"></audio>
        <div class="entry-buttons">
          <a href="${entry.audio_path}" download class="btn secondary small">⬇️ Download</a>
          <button class="btn danger small delete-entry-btn" data-id="${entry.id}">🗑️ Verwijder</button>
        </div>
      </div>
      ${entry.content_text ? `<details class="entry-text"><summary>Bekijk tekst</summary><p>${entry.content_text.replace(/\n/g, "<br>")}</p></details>` : ""}
    `;

    studioEntriesList.appendChild(item);
  });

  // Add delete handlers
  studioEntriesList.querySelectorAll(".delete-entry-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Weet je zeker dat je deze entry wilt verwijderen?")) return;

      const id = btn.dataset.id;
      btn.disabled = true;
      btn.textContent = "...";

      try {
        await request(`/api/admin/studio/entries/${id}`, { method: "DELETE" });
        loadStudioEntries();
      } catch (err) {
        alert(`Verwijderen mislukt: ${err.message}`);
        btn.disabled = false;
        btn.textContent = "🗑️ Verwijder";
      }
    });
  });
}

async function loadLogs(limit = null) {
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit);
  if (filterName?.value?.trim()) params.append("firstName", filterName.value.trim());
  if (filterAge?.value) params.append("age", filterAge.value);
  if (filterFrom?.value) params.append("dateFrom", filterFrom.value);
  if (filterTo?.value) params.append("dateTo", filterTo.value);
  if (filterSummary?.value?.trim()) params.append("summary", filterSummary.value.trim());

  try {
    const data = await request(`/api/admin/logs?${params.toString()}`, { method: "GET" });
    renderLogs(data.logs || []);
  } catch (err) {
    console.error(err);
    if (logsList) logsList.innerHTML = `<p style="color: var(--admin-muted);">${err.message}</p>`;
  }
}

function renderLogs(logs) {
  if (!logs.length) {
    logsList.innerHTML = '<p style="color: var(--admin-muted); text-align: center;">Geen logs gevonden.</p>';
    return;
  }
  logsList.innerHTML = "";
  logs.forEach((log) => {
    const item = document.createElement("article");
    item.className = "log-item";
    const created = new Date(log.created_at).toLocaleString("nl-BE");

    const header = document.createElement("div");
    header.className = "log-header";

    const chipsContainer = document.createElement("div");
    const nameChip = document.createElement("span");
    nameChip.className = "chip";
    nameChip.textContent = log.first_name;
    chipsContainer.appendChild(nameChip);

    if (log.age) {
      const ageChip = document.createElement("span");
      ageChip.className = "chip secondary";
      ageChip.textContent = `${log.age} jaar`;
      chipsContainer.appendChild(ageChip);
    }

    const dateSmall = document.createElement("span");
    dateSmall.className = "log-date";
    dateSmall.textContent = created;

    header.appendChild(chipsContainer);
    header.appendChild(dateSmall);
    item.appendChild(header);

    const summaryDiv = document.createElement("div");
    summaryDiv.className = "log-summary";
    const summaryList = document.createElement("ul");
    (log.summary || "")
      .split(/\n+/)
      .filter(Boolean)
      .forEach((line) => {
        const li = document.createElement("li");
        li.textContent = line;
        summaryList.appendChild(li);
      });
    summaryDiv.appendChild(summaryList);
    item.appendChild(summaryDiv);
    logsList.appendChild(item);
  });
}

checkSession();
