export const PDF_TO_YAML_PROMPT = `Convert the following extracted text from a PDF DS-160 form into a structured YAML format.

Important: Return ONLY the raw YAML content. Do not include any markdown formatting, code blocks, or backticks.

Use this exact structure:

personal_page1:
  surname: ""
  given_name: ""
  full_name_native_alphabet: ""
  full_name_native_alphabet_na: false
  has_other_names_used: ""
  other_names_surname: ""
  other_names_given: ""
  has_telecode: "N"
  telecode_surname: ""
  telecode_given: ""
  sex: ""
  marital_status: ""
  birth_date_mm: "NOV"
  birth_date_dd: "01"
  birth_date_yyyy: "1984"
  birth_city: "BANGALORE"
  birth_state_province: "KARNATAKA"
  birth_country: "INDIA"

personal_page2:
  nationality: "INDIA"
  has_other_nationality: "N"
  other_nationality:
    country: ""
    has_passport: "N"
    passport_number: ""
  has_permanent_resident: "N"
  permanent_resident_country: ""
  national_id: "766928575"
  national_id_na: true
  us_social_security:
    number1: "233"
    number2: "12"
    number3: "4567"
    na: false
  us_taxpayer_id_na: true
  us_taxpayer_id: "123456789"

travel_page:
  purpose_of_trip: "EXCHANGE VISITOR (J)"
  other_purpose_of_trip: "EXCHANGE VISITOR (J1)"
  who_is_paying: "Self"
  payer_details:
    surname: ""
    phone: ""
    address_same_as_home: ""
    relationship: ""
    address:
      street1: ""
      street2: ""
      city: ""
      state: ""
      postal_code: ""
      country: ""
  specific_travel_plans: "N"
  specific_travel_plans_details:
    arrival:
      month: "JAN"
      day: "01"
      year: "2000"
      flight: ""
      city: ""
    departure:
      month: ""
      day: ""
      year: ""
      flight: ""
      city: ""
    locations_to_visit: ""
    length_of_stay:
      number: "1"
      unit: "Year(s)"
  non_specific_travel_plans_details:
    arrival:
      month: "JAN"
      day: "01"
      year: "2000"
    duration:
      number: "1"
      unit: "Year(s)"
  stay_address:
    street1: "339 SPEAR STREET, UNIT 40"
    street2: ""
    city: "LOS ANGELES"
    state: "CALIFORNIA"
    zip: "90001"

travel_companions_page:
  traveling_with_others: "Y"
  group_travel: "N"
  companion:
    surname: "KARINJE"
    given_name: "CUBBY"
    relationship: "CHILD"

previous_travel_page:
  previous_us_travel: "Y"
  arrival:
    month: "JAN"
    day: "01"
    year: "2000"
  length_of_stay:
    number: "1"
    unit: "Year(s)"
  drivers_license: "Y"
  license_details:
    number: "ABCD"
    state: "CALIFORNIA"
  previous_visa: "Y"
  visa_number: "DCDEFEF"
  visa_issue:
    month: "JAN"
    day: "01"
    year: "2000"
  same_type_visa: "Y"
  ten_printed: "Y"
  visa_lost: "N"
  visa_lost_details:
    year: ""
    explanation: ""
  same_country: "Y"
  visa_cancelled: "N"
  visa_cancelled_explanation: ""
  visa_refused: "N"
  visa_refused_explanation: ""
  vwp_denial: "N"
  vwp_denial_explanation: ""
  iv_petition: "Y"
  iv_petition_explanation: "Insert explanation here"

address_phone_page:
  home_address:
    street1: "339 SPEAR STREET, UNIT 40"
    street2: ""
    city: "LOS ANGELES"
    state: "CA"
    state_na: false
    postal_code: "90001"
    country: "UNITED STATES OF AMERICA"
  mail_address_same_as_home: "Y"
  phone:
    home: "1234567890"
    mobile: "1234567890"
    work: "1234567890"
    work_na: false
  add_phone: "N"
  additional_phone: ""
  add_email: "N"
  email: "test@gmail.com"
  additional_email: ""
  add_social: "N"
  social_media:
    platform_select: "FACEBOOK"
    handle: "TEST"

pptvisa_page:
  passport_type: "REGULAR"
  passport_number: "S7754691"
  passport_book_number: "ABC"
  issuance_country: "INDIA"
  issuance_location:
    city: "HYDERABAD"
    state: "TELANGANA"
    country: "UNITED STATES OF AMERICA"
  issuance:
    month: "MAR"
    day: "27"
    year: "2019"
  expiration:
    month: "MAR"
    day: "26"
    year: "2029"
  lost_passport: "N"
  lost_passport_details:
    number: ""
    country: ""
    explanation: ""

us_contact_page:
  contact:
    surname: "KARINJE"
    given_name: "CUBBY"
    organization: "DO NOT KNOW"
    relationship: "SPOUSE"
  address:
    street1: "339 SPEAR STREET, UNIT 40"
    street2: ""
    city: "LOS ANGELES"
    state: "CALIFORNIA"
    postal_code: "90001"
  phone: "1234567890"
  email: "test@gmail.com"
  email_na: false

relatives_page:
  father_surname: "KARINJE"
  father_given_name: "CUBBY"
  father_birth_day: "17"
  father_birth_month: "JAN"
  father_birth_year: "1920"
  father_in_us: "N"
  father_us_status: ""
  mother_surname: "KARINJE"
  mother_given_name: "CUBBY"
  mother_birth_day: "17"
  mother_birth_month: "JAN"
  mother_birth_year: "1920"
  mother_in_us: "N"
  mother_us_status: ""
  has_immediate_relatives: "Y"
  immediate_relative_type: "SIBLING"
  immediate_relative_status: "NONIMMIGRANT"
  immediate_relative_surname: "KARINJE"
  immediate_relative_given_name: "CUBBY"

workeducation1_page:
  occupation: "NOT EMPLOYED"
  other_occupation_explanation: "Insert explanation here"
  previous_employer: "Y"
  employer:
    name: "INSTACART"
    city: "SAN FRANCISCO"
    state: "CA"
    postal_code: "94105"
    country: "UNITED STATES OF AMERICA"
    phone: "8882467822"
    job_title: "SR DATA SCIENTIST II"
    supervisor_surname: "CHEN"
    supervisor_given_name: "CLAIRE"
    employment_date_from: "01 JUNE 2021"
    employment_date_to: "02 SEPTEMBER 2022"

workeducation2_page:
  education: "Y"
  previously_employed: "Y"
  previous_employment:
    employer: "TEST"
    address:
      street1: "339 SPEAR STREET, UNIT 40"
      street2: ""
      city: "LOS ANGELES"
      state: "CA"
      postal_code: "90001"
      country: "UNITED STATES OF AMERICA"
    phone: "1234567890"
    job_title: "TEST"
    supervisor:
      surname: "TEST"
      given_name: "TEST"
    start_date:
      month: "JAN"
      day: "01"
      year: "2021"
    end_date:
      month: "JAN"
      day: "01"
      year: "2022"
    duties: "Insert duties here"
  schools:
    name: "TEST"
    course: "TEST"
    address:
      street1: "339 SPEAR STREET, UNIT 40"
      street2: ""
      city: "LOS ANGELES"
      state: "CA"
      postal_code: "90001"
      country: "UNITED STATES OF AMERICA"
    start_date:
      month: "APR"
      day: "01"
      year: "2021"
    end_date:
      month: "JAN"
      day: "01"
      year: "2022"

workeducation3_page:
  clan_tribe_ind: "N"
  language_name: "ENGLISH"
  countries_visited_ind: "Y"
  countries_visited: "PORTUGAL"
  military_service_ind: "N"
  specialized_skills_ind: "N"
  organization_ind: "N"
  insurgent_org_ind: "N"

security_background1_page:
  disease: "N"
  disorder: "N"
  disorder_explanation: ""
  druguser: "N"

security_background2_page:
  arrested: "N"
  arrested_explanation: ""
  controlled_substances: "N"
  prostitution: "N"
  money_laundering: "N"
  human_trafficking: "N"
  assisted_trafficking: "N"
  trafficking_related: "N"

security_background3_page:
  illegal_activity: "N"
  terrorist_activity: "N"
  terrorist_support: "N"
  terrorist_org: "N"
  terrorist_relative: "N"
  genocide: "N"
  torture: "N"
  extrajudicial_violence: "N"
  child_soldier: "N"
  religious_freedom: "N"
  population_controls: "N"
  transplant: "N"

security_background4_page:
  removal_hearing: "N"
  removal_hearing_explanation: ""
  immigration_fraud: "N"
  immigration_fraud_explanation: ""
  fail_to_attend: "N"
  fail_to_attend_explanation: ""
  visa_violation: "N"
  visa_violation_explanation: ""
  deported: "N"
  deported_explanation: ""

security_background5_page:
  child_custody: "N"
  child_custody_explanation: ""
  voting_violation: "N"
  voting_violation_explanation: ""
  renounce_tax: "N"
  renounce_tax_explanation: ""
  school_reimbursement: "N"
  school_reimbursement_explanation: ""

spouse_page:
  spouse_surname: "KARINJE"
  spouse_given_name: "CUBBY"
  spouse_birth_day: "17"
  spouse_birth_month: "JAN"
  spouse_birth_year: "1920"
  spouse_nationality: "INDIA"
  spouse_birth_city: "BANGALORE"
  spouse_birth_country: "INDIA"
  spouse_address_type: "Other (Specify Address)"
  spouse_address_line1: "338 SPEAR STREET, UNIT 34E"
  spouse_address_line2: ""
  spouse_address_city: "SAN FRANCISCO"
  spouse_address_state: "CALIFORNIA"
  spouse_address_postal_code: "94105"
  spouse_address_country: "UNITED STATES OF AMERICA"

Rules:
1. Extract all relevant information from the input text
2. Map the extracted information to the corresponding YAML fields
3. Maintain the exact field names and structure from the template
4. Use proper YAML formatting with correct indentation
5. If a field's value is not found in the input, leave it empty ("")
6. For boolean fields, use true/false
7. Use Y/N for Yes/No fields
8. For month fields use first 3 letters of the month
9. For dates, use the format specified in the template
10. Preserve any special characters in names and addresses
11. For enumerated fields (like sex, marital_status), use the exact values from the template
12. Do not include any button_clicks fields
13. Return only the raw YAML without any markdown formatting or code blocks

Input text:
{extracted_text}`;

// You can also export helper functions if needed
export const generatePrompt = (extractedText: string) => {
  return PDF_TO_YAML_PROMPT.replace('{extracted_text}', extractedText);
}; 