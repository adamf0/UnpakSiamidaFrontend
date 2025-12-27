import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function formatDate(dateString){
  const date = new Date(dateString);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  
  hours = hours % 12 || 12; // ubah 0 jadi 12
  
  return <span className="flex gap-2">
    <p>{`${year}/${month}/${day}`}</p> 
    <span className="text-[#e0e0e0] text-[16px]">|</span>
    <p>{`${hours}:${minutes} ${ampm}`}</p>
  </span>;
}

export function isValidDateTime(dateString) {
    if(isEmpty(dateString)){
      return false;
    }

    const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    if (!regex.test(dateString)) return false;

    const parsed = new Date(dateString);
    return isValid(parsed);
  }

export const isEmpty = (str) => !str || str.trim().length === 0 || str === undefined || str===null;

export function buildHeaders(old, token, isjson = true) {
    let latitude = old.lat;
    let longitude = old.lng;

    // Extract ASN number: "AS24203 PT XL Axiata" → 24203
    let asnNumber = null;
    if (old.org) {
      const match = old.org.match(/AS(\d+)/i);
      if (match) asnNumber = match[1];
    }

    // Extract ISP: "AS24203 PT XL Axiata" → "PT XL Axiata"
    let isp = null;
    if (old.org) {
      const parts = old.org.split(" ");
      parts.shift(); // remove "AS24203"
      isp = parts.join(" ");
    }

    const base = {
      Authorization: `Bearer ${token}`,
      ip_address: old.ip || null,
      country: old.country || null,
      state: old.region || null,
      city: old.city || null,
      latitude: latitude,
      longitude: longitude,
      "asn-number": asnNumber,
      "asn-organization": old.org || null,
      isp: isp,
      "postal-code": old.postal || null,
    };

    // ONLY set JSON content-type if needed
    if (isjson) {
      base["Content-Type"] = "application/json";
    }

    return base;
}
export function mappedText(text){
  if(text=="admin"){
      return "Admin";
  }
  if(text=="auditee"){
      return "Auditee";
  }
  if(text=="auditor1"){
      return "Auditor Utama";
  }
  if(text=="auditor2"){
      return "Auditor Pedamping";
  }
  return "User";
}

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const isValidationError = (code) => typeof code === "string" && code.endsWith(".Validation");
export const normalizeValidationMessage = (messageObj) => {
  if (!messageObj || typeof messageObj !== "object") return "Validasi gagal";

  return Object.entries(messageObj)
    .map(([field, msg]) => `${field} : ${msg}`)
    .join("\n");
};

export const delay = (ms) => new Promise(res => setTimeout(res, ms));