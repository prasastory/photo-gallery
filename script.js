// 👉 ambil foto dari folder Google Drive (public folder)
const FOLDER_ID = "1Tf_2k6Gpra2Og-rgSuJFQhZ9VT--gP62";

// API public list file drive
const API_KEY = "AIzaSyDQglC_g_MLbYeEj8mgVx6u6gxZJsbDL-Q";

let selectedPrint = [];
let selectedEdit = [];

async function loadPhotos() {

  const url =
  `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType+contains+'image/'&key=${API_KEY}&fields=files(id,name)`;

  const res = await fetch(url);
  const data = await res.json();

  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";

  data.files.forEach(file => {

    // ⭐ LINK FINAL YANG BENAR
    const imgUrl = `https://drive.google.com/thumbnail?id=${file.id}&sz=w1000`;

    const card = document.createElement("div");
    card.className = "photoCard";

    card.innerHTML = `
  <img src="${imgUrl}" loading="lazy" referrerpolicy="no-referrer">
  <p>${file.name}</p>
  <div class="btnGroup">
    <button class="print" onclick="selectPrint('${file.name}', this)">Cetak</button>
    <button class="edit" onclick="selectEdit('${file.name}', this)">Edit</button>
  </div>
`;

    gallery.appendChild(card);
  });
}

loadPhotos();

loadPhotos();

function selectPrint(name, btn){
  selectedPrint.push(name);
  btn.classList.add("selectedPrint");
}

function selectEdit(name, btn){
  selectedEdit.push(name);
  btn.classList.add("selectedEdit");
}