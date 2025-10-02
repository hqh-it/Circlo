// services/User/address.js
import {
  getDistrictsByProvinceCode,
  getProvinces,
  getWardsByDistrictCode
} from "sub-vn";

// Giới hạn dữ liệu để tránh crash
export function fetchProvinces() {
  try {
    const provinces = getProvinces();
    return provinces.slice(0, 63); // 63 tỉnh thành
  } catch (error) {
    console.error('Error loading provinces:', error);
    return [];
  }
}

export function fetchDistricts(provinceCode) {
  try {
    const districts = getDistrictsByProvinceCode(provinceCode);
    return districts || [];
  } catch (error) {
    console.error('Error loading districts:', error);
    return [];
  }
}

export function fetchWards(districtCode) {
  try {
    const wards = getWardsByDistrictCode(districtCode);
    return wards || [];
  } catch (error) {
    console.error('Error loading wards:', error);
    return [];
  }
}

// Hàm lấy địa chỉ đầy đủ
export function getFullAddress(
  provinceCode,
  districtCode,
  wardCode,
  street,
  provinces,
  districts,
  wards
) {
  const province = provinces.find(p => p.code === provinceCode)?.name || '';
  const district = districts.find(d => d.code === districtCode)?.name || '';
  const ward = wards.find(w => w.code === wardCode)?.name || '';
  
  return `${street}, ${ward}, ${district}, ${province}`;
}

export async function loadAddressHierarchy(provinceCode, districtCode, wardCode) {
  try {
    // Load provinces first
    const provinces = fetchProvinces();
    
    let districts = [];
    let wards = [];

    // Load districts if province code exists
    if (provinceCode) {
      districts = fetchDistricts(provinceCode);
      
      // Load wards if district code exists
      if (districtCode) {
        wards = fetchWards(districtCode);
      }
    }

    return {
      provinces,
      districts,
      wards,
      selectedProvince: provinceCode || "",
      selectedDistrict: districtCode || "", 
      selectedWard: wardCode || ""
    };
  } catch (error) {
    console.error('Error loading address hierarchy:', error);
    return {
      provinces: [],
      districts: [],
      wards: [],
      selectedProvince: "",
      selectedDistrict: "",
      selectedWard: ""
    };
  }
}

// NEW: Get address names from codes
export function getAddressNames(provinceCode, districtCode, wardCode, provinces, districts, wards) {
  const provinceName = provinces.find(p => p.code === provinceCode)?.name || "";
  const districtName = districts.find(d => d.code === districtCode)?.name || "";
  const wardName = wards.find(w => w.code === wardCode)?.name || "";
  
  return { provinceName, districtName, wardName };
}