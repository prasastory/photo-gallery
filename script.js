document.addEventListener("DOMContentLoaded", () => {
    // ===== CONFIG =====
// API public list file drive
const API_KEY = "AIzaSyDQglC_g_MLbYeEj8mgVx6u6gxZJsbDL-Q";
const SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRIGnjU-NuspsgHPXlOlpD4ivngGQgekKeOF2k1PQhDFauBsc-BvWvNody3xJV4hLrYBsbheTnJzyBw/pub?gid=0&single=true&output=csv";
const SAVE_API = "https://script.google.com/macros/s/AKfycbyXb6v6qOVfqoar3PIccekHpIHSNpufZaEOh-I3NXLfJr_5vj-uOinwdlyjmIhMU0No7Q/exec";

// ambil client dari URL
const urlParams = new URLSearchParams(window.location.search);

// state pilihan
let selectedEdit = new Set();
let selectedCetak = new Set();
let MAX_EDIT = 0;
let MAX_CETAK = 0;

// ================= LOAD DATABASE =================
async function getDatabase() {
  const res = await fetch(SHEET_CSV);
  const text = await res.text();
  const rows = text.split("\n").slice(1);

  const parseQuota = value => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const db = {};
  rows.forEach(row => {
    const [client, folderId, maxEdit, maxCetak, selEdit, selCetak] = row.split(",");
    if (!client) return;

    db[client.trim().toLowerCase()] = {
      folderId: folderId ? folderId.trim() : "",
      maxEdit: parseQuota(maxEdit),
      maxCetak: parseQuota(maxCetak),
      selectedEdit: selEdit ? selEdit.split(";") : [],
      selectedCetak: selCetak ? selCetak.split(";") : []
    };
  });

  return db;
}

// ================= LOAD PHOTOS =================
async function loadPhotos(folderId) {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "<p style='text-align:center;'>Memuat foto...</p>";

  let allFiles = [];
  let pageToken = "";

  try {
    while (true) {
      const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${API_KEY}&fields=nextPageToken,files(id,name,mimeType)&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ""}`;

      const res = await fetch(url);
      const data = await res.json();

      if (!data.files) {
        console.error("Gagal load file:", data);
        gallery.innerHTML = "<p style='text-align:center;color:red;'>Gagal memuat foto.</p>";
        return;
      }

      allFiles = allFiles.concat(data.files);

      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    }

    gallery.innerHTML = "";
    const showEdit = Number.isFinite(MAX_EDIT) && MAX_EDIT > 0;
    const showCetak = Number.isFinite(MAX_CETAK) && MAX_CETAK > 0;

    allFiles.forEach(file => {
      if (!file.mimeType.includes("image")) return;

      const card = document.createElement("div");
      card.className = "photoCard";

      const img = document.createElement("img");
      img.src = `https://drive.google.com/thumbnail?id=${file.id}&sz=w1000`;
      img.className = "photo";
      img.loading = "lazy";
      img.onclick = () => openPreview(`https://drive.google.com/thumbnail?id=${file.id}&sz=w2000`);

      const statusLabel = document.createElement("div");
      statusLabel.className = "statusLabel";

      const updateStatus = () => {
        const status = [];
        card.classList.toggle("edit-selected", selectedEdit.has(file.name));
        card.classList.toggle("cetak-selected", selectedCetak.has(file.name));

        if (selectedEdit.has(file.name)) status.push("Edit dipilih");
        if (selectedCetak.has(file.name)) status.push("Cetak dipilih");
        
        if (status.length) {
          statusLabel.innerText = status.join(" • ");
          statusLabel.style.display = "block";
        } else {
          statusLabel.style.display = "none";
        }
      };

      const controls = document.createElement("div");
      controls.className = "controls";

      if (showEdit) {
        const editBox = document.createElement("input");
        editBox.type = "checkbox";
        editBox.checked = selectedEdit.has(file.name);

        editBox.onchange = () => {
          if (editBox.checked) {
            if (selectedEdit.size >= MAX_EDIT) {
              showQuotaModal("Edit", MAX_EDIT);
              editBox.checked = false;
              return;
            }
            selectedEdit.add(file.name);
          } else {
            selectedEdit.delete(file.name);
          }
          updateStatus();
          updateCounter();
        };

        const labelEdit = document.createElement("label");
        labelEdit.innerHTML = "Edit ";
        labelEdit.appendChild(editBox);
        controls.appendChild(labelEdit);
      }

      if (showCetak) {
        const cetakBox = document.createElement("input");
        cetakBox.type = "checkbox";
        cetakBox.checked = selectedCetak.has(file.name);

        cetakBox.onchange = () => {
          if (cetakBox.checked) {
            if (selectedCetak.size >= MAX_CETAK) {
              showQuotaModal("Cetak", MAX_CETAK);
              cetakBox.checked = false;
              return;
            }
            selectedCetak.add(file.name);
          } else {
            selectedCetak.delete(file.name);
          }
          updateStatus();
          updateCounter();
        };

        const labelCetak = document.createElement("label");
        labelCetak.innerHTML = "Cetak ";
        labelCetak.appendChild(cetakBox);
        controls.appendChild(labelCetak);
      }

      if (!showEdit && !showCetak) {
        const noOptions = document.createElement("div");
        noOptions.className = "noOptions";
        noOptions.innerText = "";
        controls.appendChild(noOptions);
      }

      const fileName = document.createElement("div");
      fileName.className = "filename";
      fileName.innerText = file.name;

      card.appendChild(img);
      card.appendChild(fileName);
      if (showEdit || showCetak) {
        card.appendChild(statusLabel);
      }
      card.appendChild(controls);
      gallery.appendChild(card);

      updateStatus();
    });

    updateCounter();

  } catch (err) {
    console.error("Error loadPhotos:", err);
    gallery.innerHTML = "<p style='text-align:center;color:red;'>Terjadi kesalahan saat memuat foto.</p>";
  }
}

// ================= HANDLE CLICK =================
function handleClick(fileName, img) {
  // klik 1 = edit
  // klik 2 = cetak
  // klik 3 = reset

  if (!selectedEdit.has(fileName)) {
    if (selectedEdit.size >= MAX_EDIT) {
      showQuotaModal("Edit", MAX_EDIT);
      return;
    }
    selectedEdit.add(fileName);
    img.classList.add("editSelected");
  }
  else if (!selectedCetak.has(fileName)) {
    if (selectedCetak.size >= MAX_CETAK) {
      showQuotaModal("Cetak", MAX_CETAK);
      return;
    }
    selectedCetak.add(fileName);
    img.classList.add("cetakSelected");
  }
  else {
    selectedEdit.delete(fileName);
    selectedCetak.delete(fileName);
    img.classList.remove("editSelected","cetakSelected");
  }

  updateCounter();
}

// ================= COUNTER =================
function updateCounter() {
  const editBadge = document.getElementById("editBadge");
  const cetakBadge = document.getElementById("cetakBadge");
  const badgeWrap = document.querySelector(".badgeWrap");

  const hasEditQuota = Number.isFinite(MAX_EDIT) && MAX_EDIT > 0;
  const hasCetakQuota = Number.isFinite(MAX_CETAK) && MAX_CETAK > 0;

  if (!hasEditQuota) {
    editBadge.style.display = "none";
  } else {
    editBadge.style.display = "inline-flex";
    const sisaEdit = Math.max(0, MAX_EDIT - selectedEdit.size);
    editBadge.innerText = `Sisa Edit: ${sisaEdit}`;
  }

  if (!hasCetakQuota) {
    cetakBadge.style.display = "none";
  } else {
    cetakBadge.style.display = "inline-flex";
    const sisaCetak = Math.max(0, MAX_CETAK - selectedCetak.size);
    cetakBadge.innerText = `Sisa Cetak: ${sisaCetak}`;
  }

  if (!hasEditQuota && !hasCetakQuota) {
    badgeWrap.style.display = "none";
  } else {
    badgeWrap.style.display = "flex";
  }
}


// ================= QUOTA MODAL =================
function showQuotaModal(type, maxQuota) {
  const modal = document.getElementById("quotaModal");
  const title = document.getElementById("quotaTitle");
  const message = document.getElementById("quotaMessage");
  
  title.innerText = `Jatah ${type} Habis`;
  message.innerText = `Anda telah mencapai batas maksimal ${maxQuota} pilihan ${type.toLowerCase()}.`;
  modal.style.display = "flex";
}

// ================= SAVE =================
document.getElementById("saveBtn").onclick = async () => {
  const loadingModal = document.getElementById("loadingModal");
  const successModal = document.getElementById("successModal");
  
  loadingModal.style.display = "flex";

  const formData = new URLSearchParams();
  formData.append("client", clientName);
  formData.append("selectedEdit", Array.from(selectedEdit).join(";"));
  formData.append("selectedCetak", Array.from(selectedCetak).join(";"));

  try {
    const res = await fetch(SAVE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData
    });

    const text = await res.text();
    console.log(text);

    loadingModal.style.display = "none";
    successModal.style.display = "flex";
    
    setTimeout(() => {
      successModal.style.display = "none";
    }, 3000);
  } catch (err) {
    console.error("Error saving:", err);
    loadingModal.style.display = "none";
    alert("Gagal menyimpan pilihan. Silahkan coba lagi.");
  }
};

// ================= INIT =================
async function init() {
  const db = await getDatabase();
  const client = db[clientName.toLowerCase()];
  if (!client) return alert("Client tidak ditemukan");

  MAX_EDIT = Number.isFinite(client.maxEdit) ? client.maxEdit : 0;
  MAX_CETAK = Number.isFinite(client.maxCetak) ? client.maxCetak : 0;
  selectedEdit = MAX_EDIT > 0 ? new Set(client.selectedEdit) : new Set();
  selectedCetak = MAX_CETAK > 0 ? new Set(client.selectedCetak) : new Set();

  const headerSubtitle = document.querySelector(".brandText p");
  const bottomBar = document.querySelector(".bottomBar");
  
  if (MAX_EDIT > 0 || MAX_CETAK > 0) {
    headerSubtitle.style.display = "block";
    bottomBar.style.display = "flex";
  } else {
    headerSubtitle.style.display = "none";
    bottomBar.style.display = "none";
  }

  loadPhotos(client.folderId);
}

function openPreview(src){
  const modal = document.getElementById("previewModal");
  const img = document.getElementById("previewImg");
  img.src = src;
  modal.style.display = "flex";
}

document.getElementById("previewModal").onclick = () =>{
  document.getElementById("previewModal").style.display="none";
}

// ambil nama client dari URL
const params = new URLSearchParams(window.location.search);
const clientName = params.get("client");

if(clientName){
  document.getElementById("clientName").textContent = clientName;
}else{
  document.getElementById("clientName").textContent = "Guest";
}


init();
}); // ← penutup DOMContentLoaded
window.addEventListener("scroll", () => {
  const header = document.getElementById("mainHeader");
  if (window.scrollY > 60) {
    header.classList.add("shrink");
  } else {
    header.classList.remove("shrink");
  }
});
