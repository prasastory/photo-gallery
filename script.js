document.addEventListener("DOMContentLoaded", () => {
    // ===== CONFIG =====
// API public list file drive
const API_KEY = "AIzaSyDQglC_g_MLbYeEj8mgVx6u6gxZJsbDL-Q";
const SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRIGnjU-NuspsgHPXlOlpD4ivngGQgekKeOF2k1PQhDFauBsc-BvWvNody3xJV4hLrYBsbheTnJzyBw/pub?gid=0&single=true&output=csv";
const SAVE_API = "https://script.google.com/macros/s/AKfycbyXb6v6qOVfqoar3PIccekHpIHSNpufZaEOh-I3NXLfJr_5vj-uOinwdlyjmIhMU0No7Q/exec";

  // ambil client dari URL
  const params = new URLSearchParams(window.location.search);
  const clientName = params.get("client");

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

    const db = {};
    rows.forEach(row => {
      const [client, folderId, maxEdit, maxCetak, selEdit, selCetak] = row.split(",");
      if (!client) return;

      db[client.trim().toLowerCase()] = {
        folderId: folderId.replace(/[^a-zA-Z0-9_-]/g, ""),
        maxEdit: Number(maxEdit),
        maxCetak: Number(maxCetak),
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
        const query = encodeURIComponent(`'${folderId}' in parents`);

        const url = `https://www.googleapis.com/drive/v3/files?q=${query}&key=${API_KEY}&fields=nextPageToken,files(id,name,mimeType)&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ""}`;

        const res = await fetch(url);
        const data = await res.json();

        if (!data.files) {
          gallery.innerHTML = "<p style='text-align:center;color:red;'>Terjadi kesalahan saat memuat foto.</p>";
          return;
        }

        allFiles = allFiles.concat(data.files);
        if (!data.nextPageToken) break;
        pageToken = data.nextPageToken;
      }

      gallery.innerHTML = "";

      allFiles.forEach(file => {
        if (!file.mimeType.includes("image")) return;

        const card = document.createElement("div");
        card.className = "photoCard";

        const img = document.createElement("img");
        img.src = `https://drive.google.com/thumbnail?id=${file.id}&sz=w1000`;
        img.className = "photo";
        img.loading = "lazy";
        img.onclick = () => openPreview(`https://drive.google.com/thumbnail?id=${file.id}&sz=w2000`);

        // ===== CHECKBOX EDIT =====
        const editBox = document.createElement("input");
        editBox.type = "checkbox";
        editBox.checked = selectedEdit.has(file.name);

        editBox.onchange = () => {
          if (editBox.checked) {
            if (selectedEdit.size >= MAX_EDIT) {
              alert("Jatah edit habis!");
              editBox.checked = false;
              return;
            }
            selectedEdit.add(file.name);
          } else {
            selectedEdit.delete(file.name);
          }
          updateCounter();
        };

        // ===== CHECKBOX CETAK =====
        const cetakBox = document.createElement("input");
        cetakBox.type = "checkbox";
        cetakBox.checked = selectedCetak.has(file.name);

        cetakBox.onchange = () => {
          if (cetakBox.checked) {
            if (selectedCetak.size >= MAX_CETAK) {
              alert("Jatah cetak habis!");
              cetakBox.checked = false;
              return;
            }
            selectedCetak.add(file.name);
          } else {
            selectedCetak.delete(file.name);
          }
          updateCounter();
        };

        const labelEdit = document.createElement("label");
        labelEdit.innerHTML = "Edit ";
        labelEdit.appendChild(editBox);

        const labelCetak = document.createElement("label");
        labelCetak.innerHTML = "Cetak ";
        labelCetak.appendChild(cetakBox);

        const controls = document.createElement("div");
        controls.className = "controls";
        controls.appendChild(labelEdit);
        controls.appendChild(labelCetak);

        const fileName = document.createElement("div");
        fileName.className = "filename";
        fileName.innerText = file.name;

        card.appendChild(img);
        card.appendChild(fileName);
        card.appendChild(controls);
        gallery.appendChild(card);
      });

      updateCounter();

    } catch (err) {
      gallery.innerHTML = "<p style='text-align:center;color:red;'>Terjadi kesalahan saat memuat foto.</p>";
    }
  }

  // ================= COUNTER =================
  function updateCounter() {
    const editBadge = document.getElementById("editBadge");
    const cetakBadge = document.getElementById("cetakBadge");

    // Sisa Edit hilang jika 0
    if (MAX_EDIT <= 0) {
      editBadge.style.display = "none";
    } else {
      const sisaEdit = MAX_EDIT - selectedEdit.size;
      editBadge.style.display = "inline-block";
      editBadge.innerText = `Sisa Edit: ${sisaEdit}`;
    }

    // Cetak tetap normal
    const sisaCetak = MAX_CETAK - selectedCetak.size;
    cetakBadge.innerText = `Sisa Cetak: ${sisaCetak}`;
  }

  // ================= SAVE =================
  document.getElementById("saveBtn").onclick = async () => {
    const formData = new URLSearchParams();
    formData.append("client", clientName);
    formData.append("selectedEdit", Array.from(selectedEdit).join(";"));
    formData.append("selectedCetak", Array.from(selectedCetak).join(";"));

    await fetch(SAVE_API, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData
    });

    alert("Pilihan berhasil disimpan!");
  };

  // ================= PREVIEW =================
  function openPreview(src){
    const modal = document.getElementById("previewModal");
    const img = document.getElementById("previewImg");
    img.src = src;
    modal.style.display = "flex";
  }

  document.getElementById("previewModal").onclick = () =>{
    document.getElementById("previewModal").style.display="none";
  }

  // ================= INIT =================
  async function init() {
    const db = await getDatabase();
    const client = db[clientName.toLowerCase()];
    if (!client) return alert("Client tidak ditemukan");

    MAX_EDIT = client.maxEdit;
    MAX_CETAK = client.maxCetak;
    selectedEdit = new Set(client.selectedEdit);
    selectedCetak = new Set(client.selectedCetak);

    document.getElementById("clientName").textContent = clientName;
    updateCounter();
    loadPhotos(client.folderId);
  }

  init();
});

// SHRINK HEADER
window.addEventListener("scroll", () => {
  const header = document.getElementById("mainHeader");
  if (window.scrollY > 60) header.classList.add("shrink");
  else header.classList.remove("shrink");
});
