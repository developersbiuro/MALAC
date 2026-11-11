// Pakistan location dataset for the cascading Province → City → Area
// address pickers (Checkout + Profile Settings address book), modelled
// on Daraz.pk's address flow.
//
// Shape:
//   PROVINCES: [{ name, districts: [{ name, cities: [String],
//                  areasByCity: { [cityName]: [String] } }] }]
//   - `districts` follows the official administrative divisions of each
//     province / territory (district counts: Punjab 41, Sindh 30,
//     Khyber Pakhtunkhwa 37, Balochistan 35, Gilgit-Baltistan 14,
//     Azad Jammu & Kashmir 10, Islamabad Capital Territory 1).
//   - `cities` lists the district headquarters first, then other notable
//     towns / tehsil seats of the district. 566 place entries; 551
//     unique names (a few cities span several districts).
//   - `areasByCity` carries neighbourhood / colony / sector lists for
//     the major metros (Karachi, Lahore, Islamabad, Rawalpindi,
//     Faisalabad, Multan, Peshawar, Quetta, Hyderabad, Sialkot,
//     Gujranwala, Bahawalpur, Sargodha, Abbottabad), and pakAreas.js
//     (EXTRA_AREAS) adds city-wise lists for 250+ more courier-covered
//     cities and towns — areasOfCity() merges both, de-duplicated.
//     Cities without an entry simply have no suggested areas — the
//     area field stays a free-text input everywhere, so any colony
//     name can be typed and checkout is never blocked.
//
// Helpers exported for the picker component:
//   citiesOfProvince(name)  -> flat [{ city, district }] for a province
//   areasOfCity(city)       -> [String] (empty when unknown)
//   findCity(cityName)      -> { province, district, city } | null
//                              (case-insensitive; used to adopt GPS
//                              reverse-geocoded cities and to prefill
//                              the province of legacy saved addresses)
import { EXTRA_AREAS } from "./pakAreas.js";

export const PROVINCES = [
  {
    name: "Punjab",
    districts: [
      { name: "Attock", cities: ["Attock", "Hassan Abdal", "Fateh Jang", "Pindi Gheb", "Jand", "Hazro"] },
      { name: "Bahawalnagar", cities: ["Bahawalnagar", "Chishtian", "Haroonabad", "Fort Abbas", "Minchinabad"] },
      { name: "Bahawalpur", cities: ["Bahawalpur", "Ahmedpur East", "Hasilpur", "Khairpur Tamewali", "Yazman"],
        areasByCity: { Bahawalpur: ["Model Town A", "Model Town B", "Satellite Town", "Cantt", "Gulberg", "Hashmi Garden", "Islamia Colony", "Bindra Basti", "Mohallah Qazian", "Farid Gate", "Circular Road", "Airport Road", "Chowk Fawara", "Derawar Fort Road", "Bahawal Club Road", "Musuem Road", "One Unit Staff Colony", "Cheema Town", "Khanqah Sharif Road", "Old City"] } },
      { name: "Bhakkar", cities: ["Bhakkar", "Darya Khan", "Kalur Kot", "Mankera"] },
      { name: "Chakwal", cities: ["Chakwal", "Choa Saidan Shah", "Kallar Kahar", "Talagang"] },
      { name: "Chiniot", cities: ["Chiniot", "Bhowana", "Lalian"] },
      { name: "Dera Ghazi Khan", cities: ["Dera Ghazi Khan", "Taunsa", "Kot Chutta"] },
      { name: "Faisalabad", cities: ["Faisalabad", "Jaranwala", "Samundri", "Tandlianwala", "Jhumra", "Khurrianwala"],
        areasByCity: { Faisalabad: ["D Ground", "Peoples Colony", "Madina Town", "Eden Gardens", "Model City", "Gulberg", "Batala Colony", "Millat Town", "Jinnah Colony", "Kohinoor City", "Satiana Road", "Jaranwala Road", "Sargodha Road", "Narwala Road", "Ghulam Muhammad Abad", "Allama Iqbal Colony", "Dijkot Road", "Civil Lines", "Railway Colony", "Warispura", "Tariqabad", "Mansoorabad", "Nishatabad", "Eden Executive", "Khayaban Gardens", "Green Town", "FDA City", "Wadi-e-Sitara", "Chak Jhumra Road", "Amin Town"] } },
      { name: "Gujranwala", cities: ["Gujranwala", "Kamoke", "Nowshera Virkan", "Wazirabad", "Qila Didar Singh", "Eminabad"],
        areasByCity: { Gujranwala: ["Satellite Town", "Model Town", "Peoples Colony", "Civil Lines", "Cantt", "DC Colony", "Garden Town", "Wapda Town", "Citi Housing", "Green Town", "Mohallah Islamabad", "Khokharki", "Aroop", "Nandipur", "Chan Da Qila", "Gill Road", "Gondlanwala Road", "Sialkot Road", "Grand Trunk Road", "Rahwali", "Dhulley", "Baghbanpura", "Shaheenabad", "Faqirpura", "Garjakh", "Khiali", "Lohianwala", "Master City", "Ajwa City", "Alipur Chatha Road"] } },
      { name: "Gujrat", cities: ["Gujrat", "Kharian", "Sarai Alamgir", "Lalamusa", "Dinga", "Jalalpur Jattan"] },
      { name: "Hafizabad", cities: ["Hafizabad", "Pindi Bhattian", "Sukheke", "Jalalpur Bhattian"] },
      { name: "Jhang", cities: ["Jhang", "Shorkot", "Ahmadpur Sial", "Athara Hazari"] },
      { name: "Jhelum", cities: ["Jhelum", "Dina", "Sohawa", "Pind Dadan Khan", "Khewra"] },
      { name: "Kasur", cities: ["Kasur", "Pattoki", "Chunian", "Kot Radha Kishan", "Mustafabad"] },
      { name: "Khanewal", cities: ["Khanewal", "Mian Channu", "Kabirwala", "Jahanian", "Abdul Hakim"] },
      { name: "Khushab", cities: ["Khushab", "Jauharabad", "Nurpur Thal", "Quaidabad"] },
      { name: "Kot Addu", cities: ["Kot Addu", "Chowk Sarwar Shaheed", "Sinawan"] },
      { name: "Lahore", cities: ["Lahore"],
        areasByCity: { Lahore: ["Gulberg", "DHA Phase 1", "DHA Phase 2", "DHA Phase 3", "DHA Phase 4", "DHA Phase 5", "DHA Phase 6", "DHA Phase 7", "DHA Phase 8", "DHA Phase 9", "Model Town", "Johar Town", "Wapda Town", "Valencia Town", "Bahria Town", "Lake City", "Askari 11", "Cantt", "Mall Road", "Anarkali", "Ichhra", "Shadman", "Garden Town", "Faisal Town", "Township", "Green Town", "Samanabad", "Allama Iqbal Town", "Sabzazar", "Multan Road", "Thokar Niaz Beg", "Raiwind", "Bedian Road", "Cavalry Ground", "Gulshan-e-Ravi", "Baghbanpura", "Shalimar", "Harbanspura", "Mughalpura", "Daroghawala", "Shahdara", "Kot Lakhpat", "Chung", "Eden City", "Punjab Housing Society", "NFC Society", "PIA Society", "Revenue Society"] } },
      { name: "Taunsa", cities: ["Taunsa", "Vehowa", "Tibbi Qaisrani"] },
      { name: "Layyah", cities: ["Layyah", "Karor Lal Esan", "Chaubara", "Fatehpur"] },
      { name: "Lodhran", cities: ["Lodhran", "Dunyapur", "Kahror Pacca"] },
      { name: "Mandi Bahauddin", cities: ["Mandi Bahauddin", "Phalia", "Malakwal"] },
      { name: "Mianwali", cities: ["Mianwali", "Piplan", "Isa Khel", "Kalabagh"] },
      { name: "Multan", cities: ["Multan", "Shujabad", "Jalalpur Pirwala"],
        areasByCity: { Multan: ["Cantt", "Gulgasht Colony", "Bosan Road", "Shah Rukn-e-Alam Colony", "New Multan", "Wapda Town", "Model Town", "Garden Town", "Mumtazabad", "Qadirpur Ran", "Nishtar Road", "Chungi No 9", "Vehari Road", "Khanewal Road", "Old Shujabad Road", "Sameejabad", "Peer Khurshid Colony", "Altaf Town", "Buch Villas", "Royal Orchard", "DHA Multan", "Boson City", "MP Chah Miran", "Inner City", "Haram Gate", "Pak Gate", "Delhi Gate", "Daulat Gate", "Lohari Gate", "Bohar Gate"] } },
      { name: "Murree", cities: ["Murree", "Kotli Sattian"] },
      { name: "Muzaffargarh", cities: ["Muzaffargarh", "Alipur", "Jatoi", "Chowk Munda"] },
      { name: "Nankana Sahib", cities: ["Nankana Sahib", "Sangla Hill", "Shah Kot", "Warburton"] },
      { name: "Narowal", cities: ["Narowal", "Shakargarh", "Zafarwal"] },
      { name: "Okara", cities: ["Okara", "Depalpur", "Renala Khurd", "Hujra Shah Muqeem", "Basirpur"] },
      { name: "Pakpattan", cities: ["Pakpattan", "Arifwala"] },
      { name: "Rahim Yar Khan", cities: ["Rahim Yar Khan", "Sadiqabad", "Khanpur", "Liaqatpur"] },
      { name: "Rajanpur", cities: ["Rajanpur", "Jampur", "Rojhan", "Fazilpur"] },
      { name: "Rawalpindi", cities: ["Rawalpindi", "Murree Town", "Gujar Khan", "Taxila", "Wah Cantt", "Kahuta", "Kallar Syedan"],
        areasByCity: { Rawalpindi: ["Saddar", "Cantt", "Bahria Town Phase 7", "Bahria Town Phase 8", "DHA Phase 1", "DHA Phase 2", "Gulraiz Housing Scheme", "Satellite Town", "Shamsabad", "Chaklala Scheme 3", "Chaklala Cantt", "Westridge", "Peshawar Road", "Adiala Road", "Gulistan Colony", "Dhoke Kala Khan", "Khayaban-e-Sir Syed", "Muslim Town", "Sadiqabad", "Chandni Chowk", "Murree Road", "Commercial Market", "Banni Chowk", "Raja Bazar", "Mohanpura", "Arya Mohallah", "Kartarpura", "New Katarian", "Pirwadhai", "Faizabad", "Airport Housing Society", "Askari 11", "Askari 14", "Scheme 3", "Rawat", "Kotha Kalan", "Morgah", "Lalazar", "Tulsa Road", "Harley Street"] } },
      { name: "Sahiwal", cities: ["Sahiwal", "Chichawatni"] },
      { name: "Sargodha", cities: ["Sargodha", "Bhalwal", "Bhera", "Kot Momin", "Sahiwal Town", "Silanwali", "Shahpur"],
        areasByCity: { Sargodha: ["Satellite Town", "Cantt", "University Road", "New Satellite Town", "Gulberg Town", "Farooqa Road", "Khushab Road", "Faisalabad Road", "Lahore Road", "Queen Chowk", "Chowk Ghanta Ghar", "Trust Colony", "Iqbal Colony", "Maqbool Colony", "Civil Lines", "Factory Area", "Qanchi Mor", "Pul 47", "Chungi No 9", "Eidgah Road", "Katchery Road", "Session Court Road", "Model City", "Green Town", "Aziz Bhatti Town", "Liaqat Colony", "Muhammadia Colony", "Old Satellite Town", "Block 17"] } },
      { name: "Sheikhupura", cities: ["Sheikhupura", "Muridke", "Ferozewala", "Sharakpur", "Safdarabad"] },
      { name: "Sialkot", cities: ["Sialkot", "Daska", "Pasrur", "Sambrial", "Ugoke"],
        areasByCity: { Sialkot: ["Cantt", "Satellite Town", "Model Town", "Gulberg", "Civil Lines", "Rangpura", "Haji Pura", "Muradpur", "Kashmir Road", "Defence Road", "Airport Road", "Wazirabad Road", "Pasrur Road", "Daska Road", "Shahabpura", "Neka Pura", "Mubarakpura", "Prem Nagar", "Christian Town", "Allama Iqbal Town", "Kotli Loharan", "Bhopalwala Road", "Chapper", "Gohadpur", "Pakka Garha", "Barkat Town", "Hassan Town", "Nishat Park", "Water Works Road", "Paris Road"] } },
      { name: "Talagang", cities: ["Talagang"] },
      { name: "Toba Tek Singh", cities: ["Toba Tek Singh", "Gojra", "Kamalia", "Pir Mahal", "Rajana"] },
      { name: "Vehari", cities: ["Vehari", "Burewala", "Mailsi", "Arifwala Road"] },
      { name: "Wazirabad", cities: ["Wazirabad", "Alipur Chatha", "Dhonkal"] },
    ],
  },
  {
    name: "Sindh",
    districts: [
      { name: "Badin", cities: ["Badin", "Matli", "Talhar", "Tando Bago", "Golarchi"] },
      { name: "Dadu", cities: ["Dadu", "Mehar", "Khairpur Nathan Shah", "Johi", "Sehwan"] },
      { name: "Ghotki", cities: ["Ghotki", "Mirpur Mathelo", "Ubauro", "Daharki", "Khan Garh"] },
      { name: "Hyderabad", cities: ["Hyderabad", "Qasimabad", "Latifabad", "Tando Jam", "Tando Muhammad Khan Road"],
        areasByCity: { Hyderabad: ["Latifabad", "Qasimabad", "Cantt", "Saddar", "Heerabad", "Phuleli", "Paretabad", "Hirabad", "Gulshan-e-Zeal Pak", "Auto Bhan Road", "Thandi Sarak", "Station Road", "Tower Market", "Resham Gali", "Shahi Bazar", "Sarfaraz Colony", "Unit 6 Latifabad", "Unit 8 Latifabad", "Unit 10 Latifabad", "Unit 11 Latifabad", "Nasim Nagar", "Wadhu Wah Road", "Main Qasimabad", "Alamdar Chowk", "Citizen Colony", "Bhittai Town", "Gulistan-e-Sajjad", "Hyderabad Bypass", "Tando Jam Road", "Hali Road", "Journalist Colony", "Defence Housing Society", "Mustafa Park"] } },
      { name: "Jacobabad", cities: ["Jacobabad", "Garhi Khairo", "Thull"] },
      { name: "Jamshoro", cities: ["Jamshoro", "Kotri", "Sehwan Sharif", "Manjhand", "Bhan Saeedabad"] },
      { name: "Karachi Central", cities: ["Karachi"],
        areasByCity: { Karachi: ["Gulberg Town", "North Nazimabad", "Nazimabad", "New Karachi", "Liaquatabad", "Federal B Area", "Buffer Zone", "North Karachi", "Surjani Town", "Ahsanabad", "Gulshan-e-Maymar", "Scheme 33", "Gulistan-e-Johar", "Gulshan-e-Iqbal", "PECHS", "Bahadurabad", "Tariq Road", "Clifton", "DHA Phase 1", "DHA Phase 2", "DHA Phase 4", "DHA Phase 5", "DHA Phase 6", "DHA Phase 7", "DHA Phase 8", "Defence View", "Koranga", "Korangi", "Landhi", "Shah Faisal Colony", "Malir", "Model Colony", "Gulshan-e-Hadeed", "Bin Qasim Town", "Gadap Town", "Saddar", "Garden", "Lyari", "Keamari", "SITE Area", "Orangi Town", "Baldia Town", "Metroville", "Qasba Colony", "Nazimabad No 1", "Paposh Nagar", "Water Pump", "Ancholi", "Azizabad", "Karimabad", "Hussainabad", "Shahrah-e-Pakistan", "Soldier Bazar", "Jamshed Road", "PIB Colony", "Lasbela", "Patel Para", "Ranchore Line", "Bolton Market", "II Chundrigar Road", "Shahrah-e-Faisal", "Karsaz", "Nursery", "Mehmoodabad", "Manzoor Colony", "Qayyumabad", "Kala Pul", "Sea View", "Khadda Market", "Badar Commercial", "Zamzama", "Nishter Road", "Pakistan Chowk", "Empress Market"] } },
      { name: "Karachi East", cities: ["Karachi"] },
      { name: "Karachi South", cities: ["Karachi"] },
      { name: "Karachi West", cities: ["Karachi"] },
      { name: "Korangi", cities: ["Karachi"] },
      { name: "Keamari", cities: ["Karachi"] },
      { name: "Malir", cities: ["Karachi"] },
      { name: "Tando Allahyar", cities: ["Tando Allahyar", "Jhando Mari", "Chamber"] },
      { name: "Kashmore", cities: ["Kashmore", "Kandhkot", "Tangwani"] },
      { name: "Khairpur", cities: ["Khairpur", "Gambat", "Sobho Dero", "Kot Diji", "Thari Mirwah", "Ranipur"] },
      { name: "Larkana", cities: ["Larkana", "Ratodero", "Naudero", "Dokri", "Bakrani"] },
      { name: "Matiari", cities: ["Matiari", "Hala", "Saeedabad"] },
      { name: "Mirpur Khas", cities: ["Mirpur Khas", "Digri", "Kot Ghulam Muhammad", "Jhuddo"] },
      { name: "Naushahro Feroze", cities: ["Naushahro Feroze", "Moro", "Bhiria City", "Mehrabpur", "Kandiaro"] },
      { name: "Qambar Shahdadkot", cities: ["Qambar", "Shahdadkot", "Wagan", "Miro Khan"] },
      { name: "Sanghar", cities: ["Sanghar", "Shahdadpur", "Tando Adam", "Sinjhoro", "Khipro"] },
      { name: "Shaheed Benazirabad", cities: ["Nawabshah", "Sakrand", "Daulatpur", "Bandhi"] },
      { name: "Shikarpur", cities: ["Shikarpur", "Garhi Yasin", "Khanpur", "Lakhi"] },
      { name: "Sujawal", cities: ["Sujawal", "Jati", "Mirpur Bathoro"] },
      { name: "Sukkur", cities: ["Sukkur", "Rohri", "Pano Aqil", "Salehpat", "New Sukkur"] },
      { name: "Tando Muhammad Khan", cities: ["Tando Muhammad Khan", "Bulri Shah Karim", "Tando Ghulam Hyder"] },
      { name: "Tharparkar", cities: ["Mithi", "Diplo", "Islamkot", "Nagarparkar", "Chachro"] },
      { name: "Thatta", cities: ["Thatta", "Makli", "Gharo", "Mirpur Sakro", "Keti Bandar"] },
      { name: "Umerkot", cities: ["Umerkot", "Kunri", "Pithoro", "Samaro"] },
    ],
  },
  {
    name: "Khyber Pakhtunkhwa",
    districts: [
      { name: "Abbottabad", cities: ["Abbottabad", "Havelian", "Nathia Gali", "Qalandarabad"],
        areasByCity: { Abbottabad: ["Cantt", "Supply", "Mandian", "Jinnahabad", "Kakul Road", "Murree Road", "Mansehra Road", "Mirpur", "Nawanshehr", "PMA Road", "Bilal Town", "Habibullah Colony", "Malikpura", "Karimabad", "Gami Adda", "Main Bazaar", "Sarban Chowk", "Abbottabad Township", "Hassan Town", "Jadoon Plaza Area", "Sir Syed Colony", "Kehal", "Upper Malikpura", "Lower Malikpura", "Link Road", "Abbottabad Heights", "Nathiagali Road", "Harno", "Shimla Pahari", "Civil Lines"] } },
      { name: "Allai", cities: ["Banna"] },
      { name: "Bajaur", cities: ["Khar", "Nawagai", "Inayat Killi"] },
      { name: "Bannu", cities: ["Bannu", "Domel", "Kakki"] },
      { name: "Battagram", cities: ["Battagram", "Alai"] },
      { name: "Buner", cities: ["Daggar", "Totalai", "Chagharzai", "Gadezai"] },
      { name: "Charsadda", cities: ["Charsadda", "Tangi", "Shabqadar", "Utmanzai"] },
      { name: "Chitral Lower", cities: ["Chitral", "Drosh", "Ayun", "Buni Road"] },
      { name: "Chitral Upper", cities: ["Buni", "Mastuj", "Booni"] },
      { name: "Dera Ismail Khan", cities: ["Dera Ismail Khan", "Kulachi", "Paharpur", "Paroa"] },
      { name: "Central Dir", cities: ["Wari", "Barawal", "Kalkot"] },
      { name: "Dir Lower", cities: ["Timergara", "Adenzai", "Balambat", "Munda", "Samar Bagh"] },
      { name: "Hangu", cities: ["Hangu", "Thall", "Doaba"] },
      { name: "Haripur", cities: ["Haripur", "Khalabat", "Ghazi", "Khanpur"] },
      { name: "Karak", cities: ["Karak", "Banda Daud Shah", "Takht-e-Nasrati"] },
      { name: "Khyber", cities: ["Jamrud", "Landikotal", "Bara", "Ali Masjid"] },
      { name: "Kohat", cities: ["Kohat", "Lachi", "Gumbat", "Shakardara"] },
      { name: "Kohistan Lower", cities: ["Pattan", "Dubair"] },
      { name: "Kohistan Upper", cities: ["Dasu", "Kandia"] },
      { name: "Kolai Palas", cities: ["Palas", "Kolai"] },
      { name: "Kurram", cities: ["Parachinar", "Sadda", "Alizai"] },
      { name: "Lakki Marwat", cities: ["Lakki Marwat", "Serai Naurang", "Ghazni Khel"] },
      { name: "Malakand", cities: ["Batkhela", "Dargai", "Thana", "Totakan"] },
      { name: "Mansehra", cities: ["Mansehra", "Balakot", "Oghi", "Baffa", "Shinkiari"] },
      { name: "Mardan", cities: ["Mardan", "Takht Bhai", "Katlang", "Rustam", "Tor Warsak"] },
      { name: "Mohmand", cities: ["Ghalanai", "Ekka Ghund", "Lakaro"] },
      { name: "North Waziristan", cities: ["Miranshah", "Mir Ali", "Razmak"] },
      { name: "Nowshera", cities: ["Nowshera", "Pabbi", "Risalpur", "Akora Khattak", "Jehangira"] },
      { name: "Orakzai", cities: ["Kalaya", "Ghalezai"] },
      { name: "Peshawar", cities: ["Peshawar"],        areasByCity: { Peshawar: ["Hayatabad Phase 1", "Hayatabad Phase 2", "Hayatabad Phase 3", "Hayatabad Phase 4", "Hayatabad Phase 5", "Hayatabad Phase 6", "Hayatabad Phase 7", "University Town", "Cantt", "Saddar", "Gulberg", "DHA Peshawar", "Regi Model Town", "Warsak Road", "Ring Road", "Charsadda Road", "Kohat Road", "Dalazak Road", "Nasir Bagh Road", "Board Bazar", "Hashtnagri", "Gulbahar", "Faqirabad", "Sikandar Town", "Shahi Bagh", "Wazir Bagh", "Chamkani", "Pajaggi Road", "Bara Road", "Old City", "Qissa Khwani Bazar", "Chowk Yadgar", "Khyber Bazar", "Namak Mandi", "GT Road", "Tehkal", "Palosi", "Achini", "Sufaid Dheri", "Landi Arbab", "Bahadur Killi", "Phandu", "Rashid Garhi", "Sethi Town", "Haji Camp", "Karkhano Market"] } },
      { name: "Shangla", cities: ["Alpuri", "Bisham", "Puran", "Chakesar"] },
      { name: "South Waziristan Lower", cities: ["Wana", "Toi Khulla", "Birmal"] },
      { name: "South Waziristan Upper", cities: ["Makeen", "Ladha", "Sararogha"] },
      { name: "Swabi", cities: ["Swabi", "Topi", "Zaida", "Kalu Khan", "Razar"] },
      { name: "Swat", cities: ["Mingora", "Saidu Sharif", "Matta", "Khwazakhela", "Barikot", "Kabal", "Fatehpur"] },
      { name: "Tank", cities: ["Tank", "Jandola"] },
      { name: "Torghar", cities: ["Judba", "Khandar"] },
    ],
  },
  {
    name: "Balochistan",
    districts: [
      { name: "Awaran", cities: ["Awaran", "Jhal Jhao", "Mashkai"] },
      { name: "Barkhan", cities: ["Barkhan"] },
      { name: "Chagai", cities: ["Dalbandin", "Nokundi", "Chagai", "Taftan"] },
      { name: "Chaman", cities: ["Chaman"] },
      { name: "Dera Bugti", cities: ["Dera Bugti", "Sui", "Pir Koh"] },
      { name: "Duki", cities: ["Duki"] },
      { name: "Gwadar", cities: ["Gwadar", "Pasni", "Ormara", "Jiwani"] },
      { name: "Harnai", cities: ["Harnai", "Shahrug"] },
      { name: "Hub", cities: ["Hub", "Gaddani", "Sonmiani", "Winder"] },
      { name: "Jaffarabad", cities: ["Dera Allah Yar", "Usta Muhammad", "Gandakha"] },
      { name: "Jhal Magsi", cities: ["Jhal Magsi", "Gandawah"] },
      { name: "Kachhi", cities: ["Dhadar", "Machh", "Balanari"] },
      { name: "Kalat", cities: ["Kalat", "Mangochar", "Gazg"] },
      { name: "Kech", cities: ["Turbat", "Tump", "Mand", "Buleda", "Hoshab"] },
      { name: "Kharan", cities: ["Kharan"] },
      { name: "Khuzdar", cities: ["Khuzdar", "Wadh", "Nall", "Zehri"] },
      { name: "Kohlu", cities: ["Kohlu", "Mawand"] },
      { name: "Lasbela", cities: ["Uthal", "Bela", "Dureji"] },
      { name: "Loralai", cities: ["Loralai", "Mekhtar"] },
      { name: "Mastung", cities: ["Mastung", "Khad Koocha", "Dasht"] },
      { name: "Musakhel", cities: ["Musakhel", "Kingri"] },
      { name: "Nasirabad", cities: ["Dera Murad Jamali", "Chhattar", "Tamboo"] },
      { name: "Nushki", cities: ["Nushki"] },
      { name: "Panjgur", cities: ["Panjgur", "Parome", "Gichk"] },
      { name: "Pishin", cities: ["Pishin", "Karezat", "Barshore", "Khanozai"] },
      { name: "Qila Abdullah", cities: ["Gulistan", "Qila Abdullah", "Dobandi"] },
      { name: "Qila Saifullah", cities: ["Qila Saifullah", "Muslim Bagh", "Loiband"] },
      { name: "Quetta", cities: ["Quetta"],
        areasByCity: { Quetta: ["Cantt", "Satellite Town", "Jinnah Town", "Shahbaz Town", "Samungli Road", "Airport Road", "Brewery Road", "Sariab Road", "Hanna Road", "Zarghoon Road", "Jail Road", "Prince Road", "Liaquat Bazar", "Suraj Ganj Bazar", "Mission Road", "Toghi Road", "Stewart Road", "Model Town", "Arbab Town", "Gulistan Town", "Chaman Housing Scheme", "Shahbaz Town Phase 2", "Killi Shabo", "Killi Geo", "Pashtoonabad", "Hazara Town", "Kirani Road", "Eastern Bypass", "Western Bypass", "Nawa Killi", "Baleli", "Kuchlak", "Hanna Urak", "Spinny Road", "Adalat Road", "Mizaan Chowk", "Kandhari Bazar", "Abdul Sattar Road", "New Kahan", "Mariabad"] } },
      { name: "Sherani", cities: ["Sherani", "Mani Khwa"] },
      { name: "Shaheed Sikandarabad", cities: ["Surab", "Gidar"] },
      { name: "Sibi", cities: ["Sibi", "Lehri"] },
      { name: "Sohbatpur", cities: ["Sohbatpur", "Hairdin"] },
      { name: "Washuk", cities: ["Washuk", "Mashkel"] },
      { name: "Zhob", cities: ["Zhob", "Qamar Din Karez", "Sambaza"] },
      { name: "Ziarat", cities: ["Ziarat", "Sinjavi"] },
    ],
  },
  {
    name: "Gilgit-Baltistan",
    districts: [
      { name: "Astore", cities: ["Astore", "Eidgah", "Gorikot"] },
      { name: "Darel", cities: ["Gumari", "Darel"] },
      { name: "Diamer", cities: ["Chilas", "Thor", "Tangir"] },
      { name: "Ghanche", cities: ["Khaplu", "Mashabrum", "Daghoni"] },
      { name: "Ghizer", cities: ["Gahkuch", "Punial", "Ishkoman", "Yasin"] },
      { name: "Gilgit", cities: ["Gilgit", "Danyor", "Jutial", "Oshikhandas", "Nomal"] },
      { name: "Hunza", cities: ["Aliabad", "Karimabad", "Gulmit", "Sost", "Gojal"] },
      { name: "Kharmang", cities: ["Tolti", "Kharmang"] },
      { name: "Nagar", cities: ["Nagar", "Chalt", "Hoper"] },
      { name: "Roundu", cities: ["Dambudas", "Roundu"] },
      { name: "Shigar", cities: ["Shigar", "Askole", "Gulabpur"] },
      { name: "Skardu", cities: ["Skardu", "Gamba", "Hussainabad", "Satpara"] },
      { name: "Tangir", cities: ["Tangir", "Jaglot"] },
      { name: "Yasin", cities: ["Tauheedabad", "Yasin"] },
    ],
  },
  {
    name: "Azad Jammu & Kashmir",
    districts: [
      { name: "Bagh", cities: ["Bagh", "Dhirkot", "Hari Ghel", "Arja"] },
      { name: "Bhimber", cities: ["Bhimber", "Barnala", "Samahni"] },
      { name: "Hattian Bala", cities: ["Hattian Bala", "Chikar", "Leepa"] },
      { name: "Haveli", cities: ["Forward Kahuta", "Kahuta", "Khursheedabad"] },
      { name: "Kotli", cities: ["Kotli", "Charhoi", "Sehnsa", "Fatehpur Thakiala"] },
      { name: "Mirpur", cities: ["Mirpur", "Dadyal", "Chakswari", "Islamgarh"] },
      { name: "Muzaffarabad", cities: ["Muzaffarabad", "Garhi Dupatta", "Pattika", "Chattar Kalas"] },
      { name: "Neelum", cities: ["Athmuqam", "Kundal Shahi", "Sharda", "Kel"] },
      { name: "Poonch", cities: ["Rawalakot", "Hajira", "Abbaspur", "Thorar"] },
      { name: "Sudhnoti", cities: ["Pallandri", "Trarkhel", "Balouch", "Mang"] },
    ],
  },
  {
    name: "Islamabad Capital Territory",
    districts: [
      { name: "Islamabad", cities: ["Islamabad"],
        areasByCity: { Islamabad: ["F-6", "F-7", "F-8", "F-10", "F-11", "G-6", "G-7", "G-8", "G-9", "G-10", "G-11", "G-13", "G-14", "G-15", "H-8", "H-9", "H-12", "I-8", "I-9", "I-10", "I-11", "E-7", "E-11", "D-12", "B-17", "D-17", "Blue Area", "Jinnah Super", "Super Market", "Aabpara", "Karachi Company", "Melody Market", "Bahria Enclave", "DHA Phase 2", "PWD Colony", "Soan Gardens", "Pakistan Town", "Naval Anchorage", "Ghauri Town", "Khanna Pul", "Lehtrar Road", "Tarlai", "Chak Shahzad", "Park View City", "Bani Gala", "Bhara Kahu", "Shah Allah Ditta", "Golra Sharif", "Tarnol", "Sangjani", "Multi Gardens", "Faisal Town", "Top City", "Mumtaz City", "University Town", "Korang Town", "Media Town", "Engineers Cooperative Housing", "National Police Foundation"] } },
    ],
  },
];

// Flat [{ city, district }] list for one province, de-duplicated by city
// (a city can sit in several districts of the dataset — Karachi spans
// seven Karachi districts; keep the first district it appears under).
export function citiesOfProvince(provinceName) {
  const province = PROVINCES.find((p) => p.name === provinceName);
  if (!province) return [];
  const seen = new Set();
  const out = [];
  for (const d of province.districts) {
    for (const city of d.cities) {
      const key = city.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ city, district: d.name });
    }
  }
  return out;
}

// Suggested areas / neighbourhoods for a city: the built-in metro
// lists above merged with the city-wise EXTRA_AREAS (pakAreas.js),
// de-duplicated case-insensitively.
const EXTRA_BY_LOWER = new Map(
  Object.entries(EXTRA_AREAS).map(([city, areas]) => [city.toLowerCase(), areas])
);
export function areasOfCity(cityName) {
  if (!cityName) return [];
  const key = String(cityName).trim().toLowerCase();
  let builtin = [];
  for (const p of PROVINCES) {
    for (const d of p.districts) {
      for (const [city, areas] of Object.entries(d.areasByCity || {})) {
        if (city.toLowerCase() === key) { builtin = areas; break; }
      }
    }
  }
  const extra = EXTRA_BY_LOWER.get(key) || [];
  const seen = new Set();
  const out = [];
  for (const a of [...builtin, ...extra]) {
    const k = String(a).trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(a);
  }
  return out;
}

// Case-insensitive lookup used to adopt a free-form city name (GPS
// reverse geocode, legacy saved address) into province + district.
export function findCity(cityName) {
  if (!cityName) return null;
  const key = String(cityName).trim().toLowerCase();
  for (const p of PROVINCES) {
    for (const d of p.districts) {
      const hit = d.cities.find((c) => c.toLowerCase() === key);
      if (hit) return { province: p.name, district: d.name, city: hit };
    }
  }
  return null;
}
