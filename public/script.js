const userSelect = document.getElementById("userSelect");
const assignedNameEl = document.getElementById("assignedName");
const assignedWishlistEl = document.getElementById("assignedWishlist");
const wishRows = document.getElementById("wishRows");
const wishlistForm = document.getElementById("wishlistForm");
const statusEl = document.getElementById("status");

// references to sections and add button
const assignedSection = document.getElementById("assignedSection");
const editSection = document.getElementById("editSection");
const addWishBtn = document.getElementById("addWish");

// new refs for title and label to hide on /Imie
const mainTitle = document.getElementById("mainTitle");
const userLabel = document.getElementById("userLabel");

// new banner refs
const userBanner = document.getElementById("userBanner");
const userBannerName = document.getElementById("userBannerName");

let usersData = { users: [] };
const MAX_WISHES = 5;

// detect if we are on a name page like "/Ania"
const pathName = decodeURIComponent(location.pathname || "/");
const currentNameFromPath =
  pathName && pathName !== "/" ? pathName.slice(1) : "";

// fetch users and then initialize UI according to path
async function fetchUsers() {
  const res = await fetch("/users");
  usersData = await res.json();
  populateUserSelect();

  // If URL contains a name, try to show that user's view immediately
  if (currentNameFromPath) {
    // hide select and header on name pages
    if (userLabel) userLabel.style.display = "none";
    if (mainTitle) mainTitle.style.display = "none";
    if (userSelect) userSelect.style.display = "none";

    // show banner with nice formatting
    if (userBanner && userBannerName) {
      userBannerName.textContent = currentNameFromPath;
      userBanner.style.display = "";
    }

    // set select value if exists (for form submission convenience)
    const exists = usersData.users.some((u) => u.name === currentNameFromPath);
    if (exists) {
      userSelect.value = currentNameFromPath;
      // show sections and load data
      assignedSection.style.display = "";
      editSection.style.display = "";
      await onUserChange(currentNameFromPath);
    } else {
      // brak użytkownika — pokaż placeholder info
      assignedSection.style.display = "";
      editSection.style.display = "none";
      assignedNameEl.textContent = "Nieznany użytkownik";
      assignedWishlistEl.innerHTML = "";
    }
  } else {
    // on root: ensure select and header are visible and sections hidden until selection
    if (userLabel) userLabel.style.display = "";
    if (mainTitle) mainTitle.style.display = "";
    if (userSelect) userSelect.style.display = "";
    assignedSection.style.display = "none";
    editSection.style.display = "none";
    // hide banner on root
    if (userBanner) userBanner.style.display = "none";
  }
}

function populateUserSelect() {
  userSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "-- Wybierz imię --";
  placeholder.selected = true;
  placeholder.disabled = true;
  userSelect.appendChild(placeholder);

  usersData.users.forEach((u) => {
    const opt = document.createElement("option");
    opt.value = u.name;
    opt.textContent = u.name;
    userSelect.appendChild(opt);
  });

  updateAddButtonState();
}

function createWishRow(item = { url: "", note: "" }) {
  const row = document.createElement("div");
  row.className = "wish-row";

  const url = document.createElement("input");
  url.type = "url";
  url.placeholder = "URL prezentu";
  url.className = "wish-url";
  url.value = item.url || "";

  const note = document.createElement("input");
  note.type = "text";
  note.placeholder = "Krótka notatka";
  note.className = "wish-note";
  note.value = item.note || "";

  const actions = document.createElement("div");
  actions.className = "row-actions";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "remove-wish";
  removeBtn.textContent = "Usuń";
  removeBtn.addEventListener("click", () => {
    row.remove();
    updateAddButtonState();
  });

  actions.appendChild(removeBtn);

  // URL above note
  row.appendChild(url);
  row.appendChild(note);
  row.appendChild(actions);

  return row;
}

function fillWishInputs(wishlist) {
  wishRows.innerHTML = "";
  const items = Array.isArray(wishlist) ? wishlist : [];
  if (items.length === 0) {
    // dodaj jeden pusty wiersz, żeby użytkownik mógł szybko dodać
    wishRows.appendChild(createWishRow());
  } else {
    items.forEach((it) => wishRows.appendChild(createWishRow(it)));
  }
  updateAddButtonState();
}

function updateAddButtonState() {
  const count = wishRows.querySelectorAll(".wish-row").length;
  addWishBtn.disabled = count >= MAX_WISHES;
  addWishBtn.textContent =
    count >= MAX_WISHES ? "Limit osiągnięty" : "+ Dodaj życzenie";
}

addWishBtn.addEventListener("click", () => {
  const count = wishRows.querySelectorAll(".wish-row").length;
  if (count >= MAX_WISHES) return;
  wishRows.appendChild(createWishRow());
  updateAddButtonState();
});

async function onUserChange(overrideName) {
  const name = overrideName || userSelect.value;
  if (!name) {
    assignedSection.style.display = "none";
    editSection.style.display = "none";
    assignedNameEl.textContent = "—";
    assignedWishlistEl.innerHTML = "";
    fillWishInputs([]);
    return;
  }

  // update banner when a name is active (show inline, estetycznie)
  if (userBanner && userBannerName) {
    userBannerName.textContent = name;
    userBanner.style.display = "";
  }

  // fetch assigned data for the selected name
  const res = await fetch(`/assigned/${encodeURIComponent(name)}`);
  const data = await res.json();
  if (!data.assigned) {
    assignedNameEl.textContent = "Brak przypisanej osoby";
    assignedWishlistEl.innerHTML = "";
  } else {
    assignedNameEl.textContent = data.assigned;
    assignedWishlistEl.innerHTML = "";
    if (data.wishlist && data.wishlist.length) {
      data.wishlist.forEach((item) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = item.url || "#";
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = item.url || "Brak linku";
        const p = document.createElement("div");
        p.textContent = item.note || "";
        li.appendChild(a);
        if (item.note) li.appendChild(p);
        assignedWishlistEl.appendChild(li);
      });
    } else {
      assignedWishlistEl.innerHTML =
        "<li>Nie dodał/dodała jeszcze listy życzeń</li>";
    }
  }

  // fill own wishlist form
  const me = usersData.users.find((u) => u.name === name) || { wishlist: [] };
  fillWishInputs(me.wishlist || []);
}

// override change behavior: on root redirect to /Name, on /Name just handle normally
userSelect.addEventListener("change", () => {
  const chosen = userSelect.value;
  if (!chosen) return;
  if (!currentNameFromPath) {
    // we are on root — redirect to /Name
    location.href = "/" + encodeURIComponent(chosen);
  } else {
    // we are on a name page but select may still be visible — just update view
    onUserChange();
  }
});

// form submit: zbierz nazwę z path lub select
wishlistForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "Zapisywanie...";
  const name = currentNameFromPath || userSelect.value;
  const rows = Array.from(wishRows.querySelectorAll(".wish-row"));
  const entries = rows
    .map((r) => {
      const url = (r.querySelector(".wish-url")?.value || "").trim();
      const note = (r.querySelector(".wish-note")?.value || "").trim();
      return { url, note };
    })
    .filter((it) => it.url !== "" || it.note !== "");

  try {
    const res = await fetch("/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, wishlist: entries }),
    });
    const data = await res.json();
    if (res.ok) {
      statusEl.textContent = "Zapisano";
      await fetchUsers();
      // jeśli jesteśmy na stronie użytkownika, odśwież widok
      if (currentNameFromPath) await onUserChange(currentNameFromPath);
      else await onUserChange();
    } else {
      statusEl.textContent = data.error || "Błąd";
    }
  } catch (err) {
    statusEl.textContent = "Błąd sieci";
  }
  setTimeout(() => (statusEl.textContent = ""), 2500);
});

// init
fetchUsers();
