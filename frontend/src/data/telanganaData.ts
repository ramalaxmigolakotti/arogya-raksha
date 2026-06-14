// Telangana PHC / CHC / Health Centre verified dataset
// Source: Ayushman Arogya Mandir, Government of Telangana

export interface TelanganaFacility {
  name: string;
  district: string;
  taluka: string;
  block: string;
}

export const telanganaDistricts: string[] = [
  'Adilabad', 'Bhadradri Kothagudem', 'Hanamkonda', 'Hyderabad', 'Jagtial',
  'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy',
  'Karimnagar', 'Khammam', 'Komaram Bheem Asifabad', 'Mahabubabad',
  'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal Malkajgiri', 'Mulugu',
  'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad',
  'Peddapalli', 'Rajanna Sircilla', 'Ranga Reddy', 'Sangareddy',
  'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal',
  'Yadadri Bhuvanagiri',
];

export const telanganaFacilities: TelanganaFacility[] = [
  // Hyderabad
  { name: 'PHC Bandlaguda', district: 'Hyderabad', taluka: 'Rajendranagar', block: '(blank)' },
  { name: 'PHC Balapur', district: 'Hyderabad', taluka: 'Rajendranagar', block: '(blank)' },
  { name: 'PHC Amberpet', district: 'Hyderabad', taluka: 'Secunderabad', block: '(blank)' },
  { name: 'Urban PHC Nallakunta', district: 'Hyderabad', taluka: 'Secunderabad', block: '(blank)' },
  { name: 'Urban PHC Musheerabad', district: 'Hyderabad', taluka: 'Secunderabad', block: '(blank)' },
  { name: 'Urban PHC Malakpet', district: 'Hyderabad', taluka: 'Secunderabad', block: '(blank)' },
  { name: 'Urban PHC Golconda', district: 'Hyderabad', taluka: 'Secunderabad', block: '(blank)' },
  { name: 'CHC Saidabad', district: 'Hyderabad', taluka: 'Rajendranagar', block: '(blank)' },
  // Ranga Reddy
  { name: 'PHC Shamshabad', district: 'Ranga Reddy', taluka: 'Rajendranagar', block: 'Shamshabad' },
  { name: 'PHC Ibrahimpatnam', district: 'Ranga Reddy', taluka: 'Ibrahimpatnam', block: 'Ibrahimpatnam' },
  { name: 'PHC Maheshwaram', district: 'Ranga Reddy', taluka: 'Maheshwaram', block: 'Maheshwaram' },
  { name: 'PHC Hayathnagar', district: 'Ranga Reddy', taluka: 'Hayathnagar', block: 'Hayathnagar' },
  { name: 'CHC Chevella', district: 'Ranga Reddy', taluka: 'Chevella', block: 'Chevella' },
  { name: 'CHC Tandur', district: 'Ranga Reddy', taluka: 'Tandur', block: 'Tandur' },
  { name: 'PHC Marpalle', district: 'Ranga Reddy', taluka: 'Tandur', block: 'Tandur' },
  { name: 'PHC Pudur', district: 'Ranga Reddy', taluka: 'Malkajgiri', block: 'Malkajgiri' },
  // Medchal Malkajgiri
  { name: 'PHC Medchal', district: 'Medchal Malkajgiri', taluka: 'Medchal', block: 'Medchal' },
  { name: 'PHC Ghatkesar', district: 'Medchal Malkajgiri', taluka: 'Ghatkesar', block: 'Ghatkesar' },
  { name: 'PHC Keesara', district: 'Medchal Malkajgiri', taluka: 'Keesara', block: 'Keesara' },
  { name: 'CHC Malkajgiri', district: 'Medchal Malkajgiri', taluka: 'Malkajgiri', block: 'Malkajgiri' },
  { name: 'PHC Jawaharnagar', district: 'Medchal Malkajgiri', taluka: 'Medchal', block: 'Medchal' },
  { name: 'PHC Dundigal', district: 'Medchal Malkajgiri', taluka: 'Medchal', block: 'Medchal' },
  // Sangareddy
  { name: 'PHC Sangareddy', district: 'Sangareddy', taluka: 'Sangareddy', block: 'Sangareddy' },
  { name: 'PHC Patancheru', district: 'Sangareddy', taluka: 'Patancheru', block: 'Patancheru' },
  { name: 'CHC Zaheerabad', district: 'Sangareddy', taluka: 'Zaheerabad', block: 'Zaheerabad' },
  { name: 'PHC Narayankhed', district: 'Sangareddy', taluka: 'Narayankhed', block: 'Narayankhed' },
  { name: 'PHC Andole', district: 'Sangareddy', taluka: 'Andole', block: 'Andole' },
  { name: 'PHC Pulkal', district: 'Sangareddy', taluka: 'Sangareddy', block: 'Pulkal' },
  // Medak
  { name: 'PHC Medak', district: 'Medak', taluka: 'Medak', block: 'Medak' },
  { name: 'PHC Toopran', district: 'Medak', taluka: 'Toopran', block: 'Toopran' },
  { name: 'CHC Siddipet', district: 'Medak', taluka: 'Siddipet', block: 'Siddipet' },
  { name: 'PHC Narsapur', district: 'Medak', taluka: 'Narsapur', block: 'Narsapur' },
  { name: 'PHC Ramayampet', district: 'Medak', taluka: 'Ramayampet', block: 'Ramayampet' },
  // Siddipet
  { name: 'PHC Siddipet Urban', district: 'Siddipet', taluka: 'Siddipet', block: 'Siddipet' },
  { name: 'PHC Gajwel', district: 'Siddipet', taluka: 'Gajwel', block: 'Gajwel' },
  { name: 'CHC Husnabad', district: 'Siddipet', taluka: 'Husnabad', block: 'Husnabad' },
  { name: 'PHC Dubbak', district: 'Siddipet', taluka: 'Dubbak', block: 'Dubbak' },
  { name: 'PHC Thoguta', district: 'Siddipet', taluka: 'Thoguta', block: 'Thoguta' },
  // Nizamabad
  { name: 'PHC Nizamabad Urban', district: 'Nizamabad', taluka: 'Nizamabad', block: 'Nizamabad' },
  { name: 'PHC Bodhan', district: 'Nizamabad', taluka: 'Bodhan', block: 'Bodhan' },
  { name: 'CHC Armoor', district: 'Nizamabad', taluka: 'Armoor', block: 'Armoor' },
  { name: 'PHC Banswada', district: 'Nizamabad', taluka: 'Banswada', block: 'Banswada' },
  { name: 'PHC Yellareddy', district: 'Nizamabad', taluka: 'Yellareddy', block: 'Yellareddy' },
  { name: 'PHC Bheemgal', district: 'Nizamabad', taluka: 'Bheemgal', block: 'Bheemgal' },
  { name: 'PHC Varni', district: 'Nizamabad', taluka: 'Varni', block: 'Varni' },
  // Kamareddy
  { name: 'PHC Kamareddy', district: 'Kamareddy', taluka: 'Kamareddy', block: 'Kamareddy' },
  { name: 'PHC Bibipet', district: 'Kamareddy', taluka: 'Kamareddy', block: 'Bibipet' },
  { name: 'CHC Machareddy', district: 'Kamareddy', taluka: 'Machareddy', block: 'Machareddy' },
  { name: 'PHC Domakonda', district: 'Kamareddy', taluka: 'Domakonda', block: 'Domakonda' },
  { name: 'PHC Pitlam', district: 'Kamareddy', taluka: 'Pitlam', block: 'Pitlam' },
  // Karimnagar
  { name: 'PHC Karimnagar Urban', district: 'Karimnagar', taluka: 'Karimnagar', block: 'Karimnagar' },
  { name: 'CHC Huzurabad', district: 'Karimnagar', taluka: 'Huzurabad', block: 'Huzurabad' },
  { name: 'PHC Manakondur', district: 'Karimnagar', taluka: 'Manakondur', block: 'Manakondur' },
  { name: 'PHC Jagtial', district: 'Jagtial', taluka: 'Jagtial', block: 'Jagtial' },
  { name: 'PHC Koratla', district: 'Jagtial', taluka: 'Koratla', block: 'Koratla' },
  { name: 'CHC Metpalle', district: 'Jagtial', taluka: 'Metpalle', block: 'Metpalle' },
  { name: 'PHC Dharmapuri', district: 'Jagtial', taluka: 'Dharmapuri', block: 'Dharmapuri' },
  // Peddapalli
  { name: 'PHC Peddapalli', district: 'Peddapalli', taluka: 'Peddapalli', block: 'Peddapalli' },
  { name: 'CHC Manthani', district: 'Peddapalli', taluka: 'Manthani', block: 'Manthani' },
  { name: 'PHC Ramagundam', district: 'Peddapalli', taluka: 'Ramagundam', block: 'Ramagundam' },
  { name: 'PHC Sultanabad', district: 'Peddapalli', taluka: 'Sultanabad', block: 'Sultanabad' },
  // Rajanna Sircilla
  { name: 'PHC Sircilla', district: 'Rajanna Sircilla', taluka: 'Sircilla', block: 'Sircilla' },
  { name: 'PHC Vemulawada', district: 'Rajanna Sircilla', taluka: 'Vemulawada', block: 'Vemulawada' },
  { name: 'PHC Boinpalle', district: 'Rajanna Sircilla', taluka: 'Boinpalle', block: 'Boinpalle' },
  // Hanamkonda / Warangal
  { name: 'PHC Hanamkonda', district: 'Hanamkonda', taluka: 'Hanamkonda', block: 'Hanamkonda' },
  { name: 'Urban PHC Warangal', district: 'Warangal', taluka: 'Warangal', block: 'Warangal' },
  { name: 'CHC Parkal', district: 'Warangal', taluka: 'Parkal', block: 'Parkal' },
  { name: 'PHC Narsampet', district: 'Warangal', taluka: 'Narsampet', block: 'Narsampet' },
  { name: 'CHC Wardhannapet', district: 'Warangal', taluka: 'Wardhannapet', block: 'Wardhannapet' },
  { name: 'PHC Atmakur', district: 'Warangal', taluka: 'Atmakur', block: 'Atmakur' },
  { name: 'PHC Shayampet', district: 'Warangal', taluka: 'Shayampet', block: 'Shayampet' },
  // Jangaon
  { name: 'PHC Jangaon', district: 'Jangaon', taluka: 'Jangaon', block: 'Jangaon' },
  { name: 'PHC Ghanpur', district: 'Jangaon', taluka: 'Ghanpur', block: 'Ghanpur' },
  { name: 'PHC Palakurthi', district: 'Jangaon', taluka: 'Palakurthi', block: 'Palakurthi' },
  // Mahabubabad
  { name: 'PHC Mahabubabad', district: 'Mahabubabad', taluka: 'Mahabubabad', block: 'Mahabubabad' },
  { name: 'CHC Dornakal', district: 'Mahabubabad', taluka: 'Dornakal', block: 'Dornakal' },
  { name: 'PHC Kesamudram', district: 'Mahabubabad', taluka: 'Kesamudram', block: 'Kesamudram' },
  // Khammam
  { name: 'PHC Khammam Urban', district: 'Khammam', taluka: 'Khammam', block: 'Khammam' },
  { name: 'CHC Kothagudem', district: 'Bhadradri Kothagudem', taluka: 'Kothagudem', block: 'Kothagudem' },
  { name: 'PHC Yellandu', district: 'Bhadradri Kothagudem', taluka: 'Yellandu', block: 'Yellandu' },
  { name: 'PHC Palwancha', district: 'Bhadradri Kothagudem', taluka: 'Palwancha', block: 'Palwancha' },
  { name: 'PHC Sathupalle', district: 'Khammam', taluka: 'Sathupalle', block: 'Sathupalle' },
  { name: 'PHC Madhira', district: 'Khammam', taluka: 'Madhira', block: 'Madhira' },
  // Suryapet
  { name: 'PHC Suryapet', district: 'Suryapet', taluka: 'Suryapet', block: 'Suryapet' },
  { name: 'CHC Nalgonda', district: 'Nalgonda', taluka: 'Nalgonda', block: 'Nalgonda' },
  { name: 'PHC Miryalaguda', district: 'Nalgonda', taluka: 'Miryalaguda', block: 'Miryalaguda' },
  { name: 'PHC Bhongir', district: 'Yadadri Bhuvanagiri', taluka: 'Bhongir', block: 'Bhongir' },
  { name: 'PHC Yadagirigutta', district: 'Yadadri Bhuvanagiri', taluka: 'Yadagirigutta', block: 'Yadagirigutta' },
  // Nalgonda
  { name: 'PHC Devarakonda', district: 'Nalgonda', taluka: 'Devarakonda', block: 'Devarakonda' },
  { name: 'PHC Huzurnagar', district: 'Suryapet', taluka: 'Huzurnagar', block: 'Huzurnagar' },
  // Mahabubnagar
  { name: 'PHC Mahabubnagar Urban', district: 'Mahabubnagar', taluka: 'Mahabubnagar', block: 'Mahabubnagar' },
  { name: 'CHC Wanaparthy', district: 'Wanaparthy', taluka: 'Wanaparthy', block: 'Wanaparthy' },
  { name: 'PHC Gadwal', district: 'Jogulamba Gadwal', taluka: 'Gadwal', block: 'Gadwal' },
  { name: 'PHC Kalwakurthy', district: 'Nagarkurnool', taluka: 'Kalwakurthy', block: 'Kalwakurthy' },
  { name: 'CHC Nagarkurnool', district: 'Nagarkurnool', taluka: 'Nagarkurnool', block: 'Nagarkurnool' },
  { name: 'PHC Achampet', district: 'Nagarkurnool', taluka: 'Achampet', block: 'Achampet' },
  { name: 'PHC Narayanpet', district: 'Narayanpet', taluka: 'Narayanpet', block: 'Narayanpet' },
  // Vikarabad
  { name: 'PHC Vikarabad', district: 'Vikarabad', taluka: 'Vikarabad', block: 'Vikarabad' },
  { name: 'PHC Pargi', district: 'Vikarabad', taluka: 'Pargi', block: 'Pargi' },
  { name: 'PHC Tandur', district: 'Vikarabad', taluka: 'Tandur', block: 'Tandur' },
  // Adilabad
  { name: 'PHC Adilabad Urban', district: 'Adilabad', taluka: 'Adilabad', block: 'Adilabad' },
  { name: 'CHC Mancherial', district: 'Mancherial', taluka: 'Mancherial', block: 'Mancherial' },
  { name: 'PHC Bellampalle', district: 'Mancherial', taluka: 'Bellampalle', block: 'Bellampalle' },
  { name: 'PHC Bhainsa', district: 'Nirmal', taluka: 'Bhainsa', block: 'Bhainsa' },
  { name: 'CHC Nirmal', district: 'Nirmal', taluka: 'Nirmal', block: 'Nirmal' },
  { name: 'PHC Khanapur', district: 'Nirmal', taluka: 'Khanapur', block: 'Khanapur' },
  { name: 'PHC Asifabad', district: 'Komaram Bheem Asifabad', taluka: 'Asifabad', block: 'Asifabad' },
  { name: 'PHC Kagaznagar', district: 'Komaram Bheem Asifabad', taluka: 'Kagaznagar', block: 'Kagaznagar' },
  // Jayashankar
  { name: 'PHC Bhupalpally', district: 'Jayashankar Bhupalpally', taluka: 'Bhupalpally', block: 'Bhupalpally' },
  { name: 'PHC Mulugu', district: 'Mulugu', taluka: 'Mulugu', block: 'Mulugu' },
  // Ayurvedic & Homeo
  { name: 'Ayurvedic Health Centre Jubilee Hills', district: 'Hyderabad', taluka: 'Jubilee Hills', block: '(blank)' },
  { name: 'Homoeopathic Health Centre Dilsukhnagar', district: 'Hyderabad', taluka: 'Dilsukhnagar', block: '(blank)' },
  { name: 'Unani Health Centre Nampally', district: 'Hyderabad', taluka: 'Nampally', block: '(blank)' },
  { name: 'Ayurvedic PHC Siddipet', district: 'Siddipet', taluka: 'Siddipet', block: 'Siddipet' },
  { name: 'Homoeopathic PHC Karimnagar', district: 'Karimnagar', taluka: 'Karimnagar', block: 'Karimnagar' },
];
