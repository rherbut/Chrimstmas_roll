const userSelect = document.getElementById("userSelect");
const assignedNameEl = document.getElementById("assignedName");
const assignedWishlistEl = document.getElementById("assignedWishlist");
const wishRows = document.getElementById("wishRows");
const wishlistForm = document.getElementById("wishlistForm");
const statusEl = document.getElementById("status");

let usersData = { users: [] };

async function fetchUsers() {
  const res = await fetch("/users");
  usersData = await res.json();
  populateUserSelect();
}

function populateUserSelect() {
  userSelect.innerHTML = "";
  usersData.users.forEach((u) => {
    const opt = document.createElement("option");
    opt.value = u.name;
    opt.textContent = u.name;
    userSelect.appendChild(opt);
  });
  if (usersData.users.length) {
    userSelect.value = usersData.users[0].name;
    onUserChange();
  }
}

async function onUserChange() {
  const name = userSelect.value;
  // assigned
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
      assignedWishlistEl.innerHTML = "<li>Brak życzeń</li>";
    }
  }

  // fill own wishlist form
  const me = usersData.users.find((u) => u.name === name) || { wishlist: [] };
  fillWishInputs(me.wishlist || []);
}

function fillWishInputs(wishlist) {
  wishRows.innerHTML = "";
  const max = 5;
  for (let i = 0; i < max; i++) {
    const row = document.createElement("div");
    row.className = "row";
    const url = document.createElement("input");
    url.type = "url";
    url.placeholder = "URL prezentu";
    url.name = `url_${i}`;
    url.value = wishlist[i] ? wishlist[i].url : "";
    const note = document.createElement("input");
    note.type = "text";
    note.placeholder = "Krótka notatka";
    note.name = `note_${i}`;
    note.value = wishlist[i] ? wishlist[i].note : "";
    row.appendChild(url);
    row.appendChild(note);
    wishRows.appendChild(row);
  }
}

wishlistForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "Zapisywanie...";
  const name = userSelect.value;
  const entries = [];
  for (let i = 0; i < 5; i++) {
    const url = wishlistForm.querySelector(`[name="url_${i}"]`).value.trim();
    const note = wishlistForm.querySelector(`[name="note_${i}"]`).value.trim();
    if (url !== "" || note !== "") {
      entries.push({ url, note });
    }
  }
  try {
    const res = await fetch("/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, wishlist: entries }),
    });
    const data = await res.json();
    if (res.ok) {
      statusEl.textContent = "Zapisano";
      // refresh users and assigned view
      await fetchUsers();
      await onUserChange();
    } else {
      statusEl.textContent = data.error || "Błąd";
    }
  } catch (err) {
    statusEl.textContent = "Błąd sieci";
  }
  setTimeout(() => (statusEl.textContent = ""), 2500);
});

userSelect.addEventListener("change", onUserChange);

// init
fetchUsers();
