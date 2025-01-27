from enum import Enum
from typing import Dict, Any, Optional
import logging

class FormPage(Enum):
    START = "start_page"
    RETRIEVE = "retrieve_page"
    SECURITY = "security_page"
    TIMEOUT = "timeout_page"
    PERSONAL1 = "personal_page1"  # p1
    PERSONAL2 = "personal_page2"  # p2
    TRAVEL = "travel_page"  # p3
    TRAVEL_COMPANIONS = "travel_companions_page"  # p4
    PREVIOUS_TRAVEL = "previous_travel_page"  # p5
    ADDRESS_PHONE = "address_phone_page"  # p6
    PPTVISA = "pptvisa_page"  # p7
    USCONTACT = "us_contact_page"  # p8
    RELATIVES = "relatives_page"  # p9
    WORK_EDUCATION1 = "workeducation1_page"  # p10
    WORK_EDUCATION2 = "workeducation2_page"  # p11
    WORK_EDUCATION3 = "workeducation3_page"  # p12
    SECURITY_BACKGROUND1 = "security_background1_page"  # p13
    SECURITY_BACKGROUND2 = "security_background2_page"  # p14
    SECURITY_BACKGROUND3 = "security_background3_page"  # p15
    SECURITY_BACKGROUND4 = "security_background4_page"  # p16
    SECURITY_BACKGROUND5 = "security_background5_page"  # p17
    SPOUSE = "spouse_page"  # p18
    

class FormMapping:
    def __init__(self):
        self.form_mapping = {
            FormPage.START: {
                "language": "ctl00_ddlLanguage",
                "location": "ctl00_SiteContentPlaceHolder_ucLocation_ddlLocation",
                "captcha": "ctl00_SiteContentPlaceHolder_ucLocation_IdentifyCaptcha1_txtCodeTextBox"
            },
            FormPage.RETRIEVE: {
                "application_id": "ctl00_SiteContentPlaceHolder_ApplicationRecovery1_tbxApplicationID",
                "surname": "ctl00_SiteContentPlaceHolder_ApplicationRecovery1_txbSurname",
                "year": "ctl00_SiteContentPlaceHolder_ApplicationRecovery1_txbDOBYear",
                "security_answer": "ctl00_SiteContentPlaceHolder_ApplicationRecovery1_txbAnswer"
            },
            FormPage.SECURITY: {
                "privacy_agreement": "ctl00_SiteContentPlaceHolder_chkbxPrivacyAct",
                "security_question": "ctl00_SiteContentPlaceHolder_ddlQuestions",
                "security_answer": "ctl00_SiteContentPlaceHolder_txtAnswer"
            },
            FormPage.PERSONAL1: {
                "surname": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_SURNAME",
                "given_name": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_GIVEN_NAME",
                "full_name_native_alphabet": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_FULL_NAME_NATIVE",
                "full_name_native_alphabet_na": "ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_FULL_NAME_NATIVE_NA",
                "has_other_names_used": "ctl00_SiteContentPlaceHolder_FormView1_rblOtherNames",
                "other_names_surname": "ctl00_SiteContentPlaceHolder_FormView1_DListAlias_ctl00_tbxSURNAME",
                "other_names_given": "ctl00_SiteContentPlaceHolder_FormView1_DListAlias_ctl00_tbxGIVEN_NAME",
                "has_telecode": "ctl00_SiteContentPlaceHolder_FormView1_rblTelecodeQuestion",
                "telecode_surname": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_TelecodeSURNAME",
                "telecode_given": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_TelecodeGIVEN_NAME",
                "sex": "ctl00_SiteContentPlaceHolder_FormView1_ddlAPP_GENDER",
                "marital_status": "ctl00_SiteContentPlaceHolder_FormView1_ddlAPP_MARITAL_STATUS",
                "birth_date_mm": "ctl00_SiteContentPlaceHolder_FormView1_ddlDOBMonth",
                "birth_date_dd": "ctl00_SiteContentPlaceHolder_FormView1_ddlDOBDay",
                "birth_date_yyyy": "ctl00_SiteContentPlaceHolder_FormView1_tbxDOBYear",
                "birth_city": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_POB_CITY",
                "birth_state_province": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_POB_ST_PROVINCE",
                "birth_state_province_na": "ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_POB_ST_PROVINCE_NA",
                "birth_country": "ctl00_SiteContentPlaceHolder_FormView1_ddlAPP_POB_CNTRY"
            },
            FormPage.PERSONAL2: {
                "nationality": "ctl00_SiteContentPlaceHolder_FormView1_ddlAPP_NATL",
                "has_other_nationality": "ctl00_SiteContentPlaceHolder_FormView1_rblAPP_OTH_NATL_IND",
                "other_nationality.country": "ctl00_SiteContentPlaceHolder_FormView1_dtlOTHER_NATL_ctl00_ddlOTHER_NATL",
                "other_nationality.has_passport": "ctl00_SiteContentPlaceHolder_FormView1_dtlOTHER_NATL_ctl00_rblOTHER_PPT_IND",
                "other_nationality.passport_number": "ctl00_SiteContentPlaceHolder_FormView1_dtlOTHER_NATL_ctl00_tbxOTHER_PPT_NUM",
                "has_permanent_resident": "ctl00_SiteContentPlaceHolder_FormView1_rblPermResOtherCntryInd",
                "permanent_resident_country": "ctl00_SiteContentPlaceHolder_FormView1_dtlOthPermResCntry_ctl00_ddlOthPermResCntry",
                "national_id": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_NATIONAL_ID",
                "national_id_na": "ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_NATIONAL_ID_NA",
                "us_social_security.number1": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_SSN1",
                "us_social_security.number2": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_SSN2",
                "us_social_security.number3": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_SSN3",
                "us_social_security.na": "ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_SSN_NA",
                "us_taxpayer_id_na": "ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_TAX_ID_NA",
                "us_taxpayer_id": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_TAX_ID"
                
            },
            FormPage.TRAVEL: {
                "purpose_of_trip": "ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_ddlPurposeOfTrip",
                "other_purpose_of_trip": "ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_ddlOtherPurpose",
                "who_is_paying": "ctl00_SiteContentPlaceHolder_FormView1_ddlWhoIsPaying",
                "specific_travel_plans": "ctl00_SiteContentPlaceHolder_FormView1_rblSpecificTravel",
                "payer_details.surname": "ctl00_SiteContentPlaceHolder_FormView1_tbxPayerSurname",
                "payer_details.given_name": "ctl00_SiteContentPlaceHolder_FormView1_tbxPayerGivenName",
                "payer_details.email": "ctl00_SiteContentPlaceHolder_FormView1_tbxPAYER_EMAIL_ADDR",
                "payer_details.phone": "ctl00_SiteContentPlaceHolder_FormView1_tbxPayerPhone",
                "payer_details.address_same_as_home": "ctl00_SiteContentPlaceHolder_FormView1_rblPayerAddrSameAsInd",
                "payer_details.relationship": "ctl00_SiteContentPlaceHolder_FormView1_ddlPayerRelationship",
                "payer_details.company_name": "ctl00_SiteContentPlaceHolder_FormView1_tbxPayingCompany",
                "payer_details.company_relationship": "ctl00_SiteContentPlaceHolder_FormView1_tbxCompanyRelation",
                "payer_details.address.street1": "ctl00_SiteContentPlaceHolder_FormView1_tbxPayerStreetAddress1",
                "payer_details.address.street2": "ctl00_SiteContentPlaceHolder_FormView1_tbxPayerStreetAddress2",
                "payer_details.address.city": "ctl00_SiteContentPlaceHolder_FormView1_tbxPayerCity",
                "payer_details.address.state": "ctl00_SiteContentPlaceHolder_FormView1_tbxPayerStateProvince",
                "payer_details.address.postal_code": "ctl00_SiteContentPlaceHolder_FormView1_tbxPayerPostalZIPCode",
                "payer_details.address.country": "ctl00_SiteContentPlaceHolder_FormView1_ddlPayerCountry",
                "specific_travel_plans_details.arrival.month": "ctl00_SiteContentPlaceHolder_FormView1_ddlARRIVAL_US_DTEMonth",
                "specific_travel_plans_details.arrival.day": "ctl00_SiteContentPlaceHolder_FormView1_ddlARRIVAL_US_DTEDay",
                "specific_travel_plans_details.arrival.year": "ctl00_SiteContentPlaceHolder_FormView1_tbxARRIVAL_US_DTEYear",
                "specific_travel_plans_details.arrival.flight": "ctl00_SiteContentPlaceHolder_FormView1_tbxArriveFlight",
                "specific_travel_plans_details.arrival.city": "ctl00_SiteContentPlaceHolder_FormView1_tbxArriveCity",
                "specific_travel_plans_details.departure.month": "ctl00_SiteContentPlaceHolder_FormView1_ddlDEPARTURE_US_DTEMonth",
                "specific_travel_plans_details.departure.day": "ctl00_SiteContentPlaceHolder_FormView1_ddlDEPARTURE_US_DTEDay",
                "specific_travel_plans_details.departure.year": "ctl00_SiteContentPlaceHolder_FormView1_tbxDEPARTURE_US_DTEYear",
                "specific_travel_plans_details.departure.flight": "ctl00_SiteContentPlaceHolder_FormView1_tbxDepartFlight",
                "specific_travel_plans_details.departure.city": "ctl00_SiteContentPlaceHolder_FormView1_tbxDepartCity",
                "specific_travel_plans_details.locations_to_visit": "ctl00_SiteContentPlaceHolder_FormView1_dtlTravelLoc_ctl00_tbxSPECTRAVEL_LOCATION",
                "stay_address.street1": "ctl00_SiteContentPlaceHolder_FormView1_tbxStreetAddress1",
                "non_specific_travel_plans_details.arrival.month": "ctl00_SiteContentPlaceHolder_FormView1_ddlTRAVEL_DTEMonth",
                "non_specific_travel_plans_details.arrival.day": "ctl00_SiteContentPlaceHolder_FormView1_ddlTRAVEL_DTEDay",
                "non_specific_travel_plans_details.arrival.year": "ctl00_SiteContentPlaceHolder_FormView1_tbxTRAVEL_DTEYear",
                "non_specific_travel_plans_details.duration.number": "ctl00_SiteContentPlaceHolder_FormView1_tbxTRAVEL_LOS",
                "non_specific_travel_plans_details.duration.unit": "ctl00_SiteContentPlaceHolder_FormView1_ddlTRAVEL_LOS_CD",
                "stay_address.street2": "ctl00_SiteContentPlaceHolder_FormView1_tbxStreetAddress2",
                "stay_address.city": "ctl00_SiteContentPlaceHolder_FormView1_tbxCity",
                "stay_address.state": "ctl00_SiteContentPlaceHolder_FormView1_ddlTravelState",
                "stay_address.zip": "ctl00_SiteContentPlaceHolder_FormView1_tbZIPCode"
            },
            FormPage.TRAVEL_COMPANIONS: {
                "traveling_with_others": "ctl00_SiteContentPlaceHolder_FormView1_rblOtherPersonsTravelingWithYou",
                "group_travel": "ctl00_SiteContentPlaceHolder_FormView1_rblGroupTravel",
                "group_name": "ctl00_SiteContentPlaceHolder_FormView1_tbxGroupName",
                "companion.surname": "ctl00_SiteContentPlaceHolder_FormView1_dlTravelCompanions_ctl00_tbxSurname",
                "companion.given_name": "ctl00_SiteContentPlaceHolder_FormView1_dlTravelCompanions_ctl00_tbxGivenName",
                "companion.relationship": "ctl00_SiteContentPlaceHolder_FormView1_dlTravelCompanions_ctl00_ddlTCRelationship"
            },
            FormPage.PREVIOUS_TRAVEL: {
                "previous_us_travel": "ctl00_SiteContentPlaceHolder_FormView1_rblPREV_US_TRAVEL_IND",
                "arrival.month": "ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl00_ddlPREV_US_VISIT_DTEMonth",
                "arrival.day": "ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl00_ddlPREV_US_VISIT_DTEDay",
                "arrival.year": "ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl00_tbxPREV_US_VISIT_DTEYear",
                "length_of_stay.number": "ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl00_tbxPREV_US_VISIT_LOS",
                "length_of_stay.unit": "ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl00_ddlPREV_US_VISIT_LOS_CD",
                "drivers_license": "ctl00_SiteContentPlaceHolder_FormView1_rblPREV_US_DRIVER_LIC_IND",
                "license_details.number": "ctl00_SiteContentPlaceHolder_FormView1_dtlUS_DRIVER_LICENSE_ctl00_tbxUS_DRIVER_LICENSE",
                "license_details.state": "ctl00_SiteContentPlaceHolder_FormView1_dtlUS_DRIVER_LICENSE_ctl00_ddlUS_DRIVER_LICENSE_STATE",
                "previous_visa": "ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_IND",
                "visa_number": "ctl00_SiteContentPlaceHolder_FormView1_tbxPREV_VISA_FOIL_NUMBER",
                "visa_issue.month": "ctl00_SiteContentPlaceHolder_FormView1_ddlPREV_VISA_ISSUED_DTEMonth",
                "visa_issue.day": "ctl00_SiteContentPlaceHolder_FormView1_ddlPREV_VISA_ISSUED_DTEDay", 
                "visa_issue.year": "ctl00_SiteContentPlaceHolder_FormView1_tbxPREV_VISA_ISSUED_DTEYear",
                "same_type_visa": "ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_SAME_TYPE_IND",
                "ten_printed": "ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_TEN_PRINT_IND",
                "visa_lost": "ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_LOST_IND",
                "visa_lost_details.year": "ctl00_SiteContentPlaceHolder_FormView1_tbxPREV_VISA_LOST_YEAR",
                "visa_lost_details.explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxPREV_VISA_LOST_EXPL",
                "same_country": "ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_SAME_CNTRY_IND",
                "visa_cancelled": "ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_CANCELLED_IND",
                "visa_cancelled_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxPREV_VISA_CANCELLED_EXPL",
                "visa_refused": "ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_REFUSED_IND",
                "visa_refused_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxPREV_VISA_REFUSED_EXPL",
                "vwp_denial": "ctl00_SiteContentPlaceHolder_FormView1_rblVWP_DENIAL_IND",
                "vwp_denial_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxVWP_DENIAL_EXPL",
                "iv_petition": "ctl00_SiteContentPlaceHolder_FormView1_rblIV_PETITION_IND",
                "iv_petition_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxIV_PETITION_EXPL"
            },
            FormPage.ADDRESS_PHONE: {
                "home_address.street1": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_LN1",
                "home_address.street2": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_LN2",
                "home_address.city": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_CITY",
                "home_address.state": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_STATE",
                "home_address.state_na": "ctl00_SiteContentPlaceHolder_FormView1_cbxAPP_ADDR_STATE_NA",
                "home_address.postal_code": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_POSTAL_CD",
                "home_address.country": "ctl00_SiteContentPlaceHolder_FormView1_ddlCountry",
                "mail_address_same_as_home": "ctl00_SiteContentPlaceHolder_FormView1_rblMailingAddrSame",
                "mail_address.street1": "ctl00_SiteContentPlaceHolder_FormView1_tbxMAILING_ADDR_LN1",
                "mail_address.street2": "ctl00_SiteContentPlaceHolder_FormView1_tbxMAILING_ADDR_LN2",
                "mail_address.city": "ctl00_SiteContentPlaceHolder_FormView1_tbxMAILING_ADDR_CITY",
                "mail_address.state": "ctl00_SiteContentPlaceHolder_FormView1_tbxMAILING_ADDR_STATE",
                "mail_address.postal_code": "ctl00_SiteContentPlaceHolder_FormView1_tbxMAILING_ADDR_POSTAL_CD",
                "mail_address.country": "ctl00_SiteContentPlaceHolder_FormView1_ddlMailCountry",
                "phone.home": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_HOME_TEL",
                "phone.mobile": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_MOBILE_TEL",
                "phone.work": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_BUS_TEL",
                "phone.work_na": "ctl00_SiteContentPlaceHolder_FormView1_cbxBUSINESS_TEL_NA",
                "add_phone": "ctl00_SiteContentPlaceHolder_FormView1_rblAddPhone",
                "additional_phone": "ctl00_SiteContentPlaceHolder_FormView1_dtlAddPhone_ctl00_tbxAddPhoneInfo",
                "add_email": "ctl00_SiteContentPlaceHolder_FormView1_rblAddEmail",
                "email": "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_EMAIL_ADDR",
                "additional_email": "ctl00_SiteContentPlaceHolder_FormView1_dtlAddEmail_ctl00_tbxAddEmailInfo",
                "add_social": "ctl00_SiteContentPlaceHolder_FormView1_rblAddSocial",
                "add_social_details.platform": "ctl00_SiteContentPlaceHolder_FormView1_dtlAddSocial_ctl00_tbxAddSocialPlat",
                "add_social_details.handle": "ctl00_SiteContentPlaceHolder_FormView1_dtlAddSocial_ctl00_tbxAddSocialHand",
                "social_media.platform_select": "ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl00_ddlSocialMedia",
                "social_media.handle": "ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl00_tbxSocialMediaIdent"
            },
            FormPage.PPTVISA: {
                "passport_type": "ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_TYPE",
                "passport_number": "ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_NUM",
                "passport_book_number": "ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_BOOK_NUM",
                "issuance_country": "ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_ISSUED_CNTRY",
                "issuance_location.city": "ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_ISSUED_IN_CITY",
                "issuance_location.state": "ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_ISSUED_IN_STATE",
                "issuance_location.country": "ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_ISSUED_IN_CNTRY",
                "issuance.month": "ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_ISSUED_DTEMonth",
                "issuance.day": "ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_ISSUED_DTEDay",
                "issuance.year": "ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_ISSUEDYear",
                "expiration.month": "ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_EXPIRE_DTEMonth",
                "expiration.day": "ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_EXPIRE_DTEDay",
                "expiration.year": "ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_EXPIREYear",
                "lost_passport": "ctl00_SiteContentPlaceHolder_FormView1_rblLOST_PPT_IND",
                "lost_passport_details.number": "ctl00_SiteContentPlaceHolder_FormView1_dtlLostPPT_ctl00_tbxLOST_PPT_NUM",
                "lost_passport_details.country": "ctl00_SiteContentPlaceHolder_FormView1_dtlLostPPT_ctl00_ddlLOST_PPT_ISSUED_CNTRY",
                "lost_passport_details.explanation": "ctl00_SiteContentPlaceHolder_FormView1_dtlLostPPT_ctl00_tbxLOST_PPT_EXPL"
            },
            FormPage.USCONTACT: {
                "contact.surname": "ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_SURNAME",
                "contact.given_name": "ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_GIVEN_NAME",
                "contact.organization": "ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_ORGANIZATION",
                "contact.relationship": "ctl00_SiteContentPlaceHolder_FormView1_ddlUS_POC_REL_TO_APP",
                "address.street1": "ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_ADDR_LN1",
                "address.street2": "ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_ADDR_LN2",
                "address.city": "ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_ADDR_CITY",
                "address.state": "ctl00_SiteContentPlaceHolder_FormView1_ddlUS_POC_ADDR_STATE",
                "address.postal_code": "ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_ADDR_POSTAL_CD",
                "phone": "ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_HOME_TEL",
                "email": "ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_EMAIL_ADDR",
                "email_na": "ctl00_SiteContentPlaceHolder_FormView1_cbxUS_POC_EMAIL_ADDR_NA"
            },
            FormPage.RELATIVES: {
                "father_surname": "ctl00_SiteContentPlaceHolder_FormView1_tbxFATHER_SURNAME",
                "father_given_name": "ctl00_SiteContentPlaceHolder_FormView1_tbxFATHER_GIVEN_NAME",
                "father_birth_day": "ctl00_SiteContentPlaceHolder_FormView1_ddlFathersDOBDay",
                "father_birth_month": "ctl00_SiteContentPlaceHolder_FormView1_ddlFathersDOBMonth",
                "father_birth_year": "ctl00_SiteContentPlaceHolder_FormView1_tbxFathersDOBYear",
                "father_in_us": "ctl00$SiteContentPlaceHolder$FormView1$rblFATHER_LIVE_IN_US_IND",
                "father_us_status": "ctl00_SiteContentPlaceHolder_FormView1_ddlFATHER_US_STATUS",
                
                "mother_surname": "ctl00_SiteContentPlaceHolder_FormView1_tbxMOTHER_SURNAME",
                "mother_given_name": "ctl00_SiteContentPlaceHolder_FormView1_tbxMOTHER_GIVEN_NAME", 
                "mother_birth_day": "ctl00_SiteContentPlaceHolder_FormView1_ddlMothersDOBDay",
                "mother_birth_month": "ctl00_SiteContentPlaceHolder_FormView1_ddlMothersDOBMonth",
                "mother_birth_year": "ctl00_SiteContentPlaceHolder_FormView1_tbxMothersDOBYear",
                "mother_in_us": "ctl00$SiteContentPlaceHolder$FormView1$rblMOTHER_LIVE_IN_US_IND",
                "mother_us_status": "ctl00_SiteContentPlaceHolder_FormView1_ddlMOTHER_US_STATUS",
                
                "has_immediate_relatives": "ctl00$SiteContentPlaceHolder$FormView1$rblUS_IMMED_RELATIVE_IND",
                "immediate_relative_type": "ctl00_SiteContentPlaceHolder_FormView1_dlUSRelatives_ctl00_ddlUS_REL_TYPE",
                "immediate_relative_status": "ctl00_SiteContentPlaceHolder_FormView1_dlUSRelatives_ctl00_ddlUS_REL_STATUS",
                "immediate_relative_surname": "ctl00_SiteContentPlaceHolder_FormView1_dlUSRelatives_ctl00_tbxUS_REL_SURNAME",
                "immediate_relative_given_name": "ctl00_SiteContentPlaceHolder_FormView1_dlUSRelatives_ctl00_tbxUS_REL_GIVEN_NAME",
                
                "has_other_relatives": "ctl00$SiteContentPlaceHolder$FormView1$rblUS_OTHER_RELATIVE_IND"
            },
            
            FormPage.SPOUSE: {
                "spouse_surname": "ctl00_SiteContentPlaceHolder_FormView1_tbxSpouseSurname",
                "spouse_given_name": "ctl00_SiteContentPlaceHolder_FormView1_tbxSpouseGivenName",
                "spouse_birth_day": "ctl00_SiteContentPlaceHolder_FormView1_ddlDOBDay",
                "spouse_birth_month": "ctl00_SiteContentPlaceHolder_FormView1_ddlDOBMonth", 
                "spouse_birth_year": "ctl00_SiteContentPlaceHolder_FormView1_tbxDOBYear",
                "spouse_nationality": "ctl00_SiteContentPlaceHolder_FormView1_ddlSpouseNatDropDownList",
                "spouse_birth_city": "ctl00_SiteContentPlaceHolder_FormView1_tbxSpousePOBCity",
                "spouse_birth_country": "ctl00_SiteContentPlaceHolder_FormView1_ddlSpousePOBCountry",
                "spouse_address_type": "ctl00_SiteContentPlaceHolder_FormView1_ddlSpouseAddressType",
                "spouse_address_line1": "ctl00_SiteContentPlaceHolder_FormView1_tbxSPOUSE_ADDR_LN1",
                "spouse_address_line2": "ctl00_SiteContentPlaceHolder_FormView1_tbxSPOUSE_ADDR_LN2",
                "spouse_address_city": "ctl00_SiteContentPlaceHolder_FormView1_tbxSPOUSE_ADDR_CITY",
                "spouse_address_state": "ctl00_SiteContentPlaceHolder_FormView1_tbxSPOUSE_ADDR_STATE",
                "spouse_address_postal_code": "ctl00_SiteContentPlaceHolder_FormView1_tbxSPOUSE_ADDR_POSTAL_CD",
                "spouse_address_country": "ctl00_SiteContentPlaceHolder_FormView1_ddlSPOUSE_ADDR_CNTRY"
            },
            FormPage.WORK_EDUCATION1: {
                "occupation": "ctl00_SiteContentPlaceHolder_FormView1_ddlPresentOccupation",
                "other_occupation_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxExplainOtherPresentOccupation",
                "employer.name": "ctl00_SiteContentPlaceHolder_FormView1_tbxEmpSchName",
                "employer.start_date.month": "ctl00_SiteContentPlaceHolder_FormView1_ddlEmpDateFromMonth",
                "employer.start_date.day": "ctl00_SiteContentPlaceHolder_FormView1_ddlEmpDateFromDay",
                "employer.start_date.year": "ctl00_SiteContentPlaceHolder_FormView1_tbxEmpDateFromYear",
                "employer.address.street1": "ctl00_SiteContentPlaceHolder_FormView1_tbxEmpSchAddr1",
                "employer.address.street2": "ctl00_SiteContentPlaceHolder_FormView1_tbxEmpSchAddr2",
                "employer.address.city": "ctl00_SiteContentPlaceHolder_FormView1_tbxEmpSchCity",
                "employer.address.state": "ctl00_SiteContentPlaceHolder_FormView1_tbxWORK_EDUC_ADDR_STATE",
                "employer.address.postal_code": "ctl00_SiteContentPlaceHolder_FormView1_tbxWORK_EDUC_ADDR_POSTAL_CD",
                "employer.phone": "ctl00_SiteContentPlaceHolder_FormView1_tbxWORK_EDUC_TEL",
                "employer.monthly_income": "ctl00_SiteContentPlaceHolder_FormView1_tbxCURR_MONTHLY_SALARY",
                "employer.duties": "ctl00_SiteContentPlaceHolder_FormView1_tbxDescribeDuties",
                "employer.address.country": "ctl00_SiteContentPlaceHolder_FormView1_ddlEmpSchCountry"
            },
            FormPage.WORK_EDUCATION2: {
                "education": "ctl00$SiteContentPlaceHolder$FormView1$rblOtherEduc",
                "previously_employed": "ctl00$SiteContentPlaceHolder$FormView1$rblPreviouslyEmployed",
                "previous_employment.employer": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbEmployerName",
                "previous_employment.address.street1": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbEmployerStreetAddress1",
                "previous_employment.address.street2": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbEmployerStreetAddress2",
                "previous_employment.address.city": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbEmployerCity",
                "previous_employment.address.state": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbxPREV_EMPL_ADDR_STATE",
                "previous_employment.address.postal_code": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbxPREV_EMPL_ADDR_POSTAL_CD",
                "previous_employment.address.country": "ctl00_SiteContentPlaceHolder_FormView1_DropDownList2",
                "previous_employment.phone": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbEmployerPhone",
                "previous_employment.job_title": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbJobTitle",
                "previous_employment.supervisor.surname": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbSupervisorSurname",
                "previous_employment.supervisor.given_name": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbSupervisorGivenName",
                "previous_employment.start_date.month": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_ddlEmpDateFromMonth",
                "previous_employment.start_date.day": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_ddlEmpDateFromDay",
                "previous_employment.start_date.year": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbxEmpDateFromYear",
                "previous_employment.end_date.month": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_ddlEmpDateToMonth",
                "previous_employment.end_date.day": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_ddlEmpDateToDay",
                "previous_employment.end_date.year": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbxEmpDateToYear",
                "previous_employment.duties": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbDescribeDuties",
                "schools.name": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolName",
                "schools.course": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolCourseOfStudy",
                "schools.address.street1": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolAddr1",
                "schools.address.street2": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolAddr2",
                "schools.address.city": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolCity",
                "schools.address.state": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxEDUC_INST_ADDR_STATE",
                "schools.address.postal_code": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxEDUC_INST_POSTAL_CD",
                "schools.address.country": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_ddlSchoolCountry",
                "schools.start_date.month": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_ddlSchoolFromMonth",
                "schools.start_date.day": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_ddlSchoolFromDay",
                "schools.start_date.year": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolFromYear",
                "schools.end_date.month": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_ddlSchoolToMonth",
                "schools.end_date.day": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_ddlSchoolToDay",
                "schools.end_date.year": "ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolToYear"
            },
            FormPage.WORK_EDUCATION3: {
                "language_name": "ctl00_SiteContentPlaceHolder_FormView1_dtlLANGUAGES_ctl00_tbxLANGUAGE_NAME",
                "clan_tribe_ind": "ctl00$SiteContentPlaceHolder$FormView1$rblCLAN_TRIBE_IND",
                "clan_tribe_name": "ctl00_SiteContentPlaceHolder_FormView1_tbxCLAN_TRIBE_NAME",
                "countries_visited_ind": "ctl00$SiteContentPlaceHolder$FormView1$rblCOUNTRIES_VISITED_IND",
                "countries_visited": "ctl00_SiteContentPlaceHolder_FormView1_dtlCountriesVisited_ctl00_ddlCOUNTRIES_VISITED",
                "military_service_ind": "ctl00$SiteContentPlaceHolder$FormView1$rblMILITARY_SERVICE_IND",
                "military_service.branch": "ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_tbxMILITARY_SVC_BRANCH",
                "military_service.rank": "ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_tbxMILITARY_SVC_RANK",
                "military_service.specialty": "ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_tbxMILITARY_SVC_SPECIALTY",
                "military_service.from_month": "ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_ddlMILITARY_SVC_FROMMonth",
                "military_service.from_day": "ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_ddlMILITARY_SVC_FROMDay",
                "military_service.from_year": "ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_tbxMILITARY_SVC_FROMYear",
                "military_service.to_month": "ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_ddlMILITARY_SVC_TOMonth",
                "military_service.to_day": "ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_ddlMILITARY_SVC_TODay",
                "military_service.to_year": "ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_tbxMILITARY_SVC_TOYear",
                "military_service.country": "ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_ddlMILITARY_SVC_CNTRY",
                "specialized_skills_ind": "ctl00$SiteContentPlaceHolder$FormView1$rblSPECIALIZED_SKILLS_IND",
                "organization_ind": "ctl00$SiteContentPlaceHolder$FormView1$rblORGANIZATION_IND",
                "insurgent_org_ind": "ctl00$SiteContentPlaceHolder$FormView1$rblINSURGENT_ORG_IND",
                "insurgent_org_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxINSURGENT_ORG_EXPL"
            },
            FormPage.SECURITY_BACKGROUND1: {
                "disease": "ctl00_SiteContentPlaceHolder_FormView1_rblDisease",
                "disease_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxDisease",
                "disorder": "ctl00_SiteContentPlaceHolder_FormView1_rblDisorder",
                "disorder_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxDisorder",
                "druguser": "ctl00_SiteContentPlaceHolder_FormView1_rblDruguser",
                "druguser_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxDruguser"
            },
            FormPage.SECURITY_BACKGROUND2: {
                "arrested": "ctl00_SiteContentPlaceHolder_FormView1_rblArrested",
                "arrested_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxArrested",
                "controlled_substances": "ctl00_SiteContentPlaceHolder_FormView1_rblControlledSubstances",
                "controlled_substances_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxControlledSubstances",
                "prostitution": "ctl00_SiteContentPlaceHolder_FormView1_rblProstitution",
                "prostitution_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxProstitution",
                "money_laundering": "ctl00_SiteContentPlaceHolder_FormView1_rblMoneyLaundering",
                "money_laundering_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxMoneyLaundering",
                "human_trafficking": "ctl00_SiteContentPlaceHolder_FormView1_rblHumanTrafficking",
                "human_trafficking_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxHumanTrafficking",
                "assisted_trafficking": "ctl00_SiteContentPlaceHolder_FormView1_rblAssistedSevereTrafficking",
                "assisted_trafficking_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxAssistedSevereTrafficking",
                "trafficking_related": "ctl00_SiteContentPlaceHolder_FormView1_rblHumanTraffickingRelated",
                "trafficking_related_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxHumanTraffickingRelated"
            },
            FormPage.SECURITY_BACKGROUND3: {
                "illegal_activity": "ctl00_SiteContentPlaceHolder_FormView1_rblIllegalActivity",
                "illegal_activity_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxIllegalActivity",
                "terrorist_activity": "ctl00_SiteContentPlaceHolder_FormView1_rblTerroristActivity",
                "terrorist_activity_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxTerroristActivity",
                "terrorist_support": "ctl00_SiteContentPlaceHolder_FormView1_rblTerroristSupport",
                "terrorist_support_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxTerroristSupport",
                "terrorist_org": "ctl00_SiteContentPlaceHolder_FormView1_rblTerroristOrg",
                "terrorist_org_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxTerroristOrg",
                "terrorist_relative": "ctl00_SiteContentPlaceHolder_FormView1_rblTerroristRel",
                "terrorist_relative_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxTerroristRel",
                "genocide": "ctl00_SiteContentPlaceHolder_FormView1_rblGenocide",
                "genocide_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxGenocide",
                "torture": "ctl00_SiteContentPlaceHolder_FormView1_rblTorture",
                "torture_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxTorture",
                "extrajudicial_violence": "ctl00_SiteContentPlaceHolder_FormView1_rblExViolence",
                "extrajudicial_violence_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxExViolence",
                "child_soldier": "ctl00_SiteContentPlaceHolder_FormView1_rblChildSoldier",
                "child_soldier_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxChildSoldier",
                "religious_freedom": "ctl00_SiteContentPlaceHolder_FormView1_rblReligiousFreedom",
                "religious_freedom_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxReligiousFreedom",
                "population_controls": "ctl00_SiteContentPlaceHolder_FormView1_rblPopulationControls",
                "population_controls_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxPopulationControls",
                "transplant": "ctl00_SiteContentPlaceHolder_FormView1_rblTransplant",
                "transplant_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxTransplant"
            },
            FormPage.SECURITY_BACKGROUND4: {
                "removal_hearing": "ctl00_SiteContentPlaceHolder_FormView1_rblRemovalHearing",
                "removal_hearing_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxRemovalHearing",
                "immigration_fraud": "ctl00_SiteContentPlaceHolder_FormView1_rblImmigrationFraud",
                "immigration_fraud_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxImmigrationFraud",
                "fail_to_attend": "ctl00_SiteContentPlaceHolder_FormView1_rblFailToAttend",
                "fail_to_attend_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxFailToAttend",
                "visa_violation": "ctl00_SiteContentPlaceHolder_FormView1_rblVisaViolation",
                "visa_violation_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxVisaViolation",
                "deported": "ctl00_SiteContentPlaceHolder_FormView1_rblDeport",
                "deported_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxDeport_EXPL"
            },
            FormPage.SECURITY_BACKGROUND5: {
                "child_custody": "ctl00_SiteContentPlaceHolder_FormView1_rblChildCustody",
                "child_custody_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxChildCustody",
                "voting_violation": "ctl00_SiteContentPlaceHolder_FormView1_rblVotingViolation",
                "voting_violation_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxVotingViolation",
                "renounce_tax": "ctl00_SiteContentPlaceHolder_FormView1_rblRenounceExp",
                "renounce_tax_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxRenounceExp",
                "school_reimbursement": "ctl00_SiteContentPlaceHolder_FormView1_rblAttWoReimb", 
                "school_reimbursement_explanation": "ctl00_SiteContentPlaceHolder_FormView1_tbxAttWoReimb"
            }
            
        }

        self.page_identifiers = {
            FormPage.START: {"verify_element": "#ctl00_ddlLanguage"},
            FormPage.RETRIEVE: {"verify_element": "#ctl00_SiteContentPlaceHolder_ApplicationRecovery1_tbxApplicationID"},
            FormPage.SECURITY: {"verify_element": "#ctl00_SiteContentPlaceHolder_chkbxPrivacyAct"},
            FormPage.PERSONAL1: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_SURNAME"},
            FormPage.PERSONAL2: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_ddlAPP_NATL"},
            FormPage.TRAVEL: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_ddlPurposeOfTrip"},
            FormPage.TRAVEL_COMPANIONS: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_rblOtherPersonsTravelingWithYou"},
            FormPage.PREVIOUS_TRAVEL: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_rblPREV_US_TRAVEL_IND"},
            FormPage.ADDRESS_PHONE: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_LN1"},
            FormPage.PPTVISA: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_NUM"},
            FormPage.USCONTACT: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_SURNAME"},
            FormPage.WORK_EDUCATION1: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_ddlPresentOccupation"},
            FormPage.WORK_EDUCATION2: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_rblPreviouslyEmployed"},
            FormPage.WORK_EDUCATION3: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_dtlLANGUAGES_ctl00_tbxLANGUAGE_NAME"},
            FormPage.SECURITY_BACKGROUND1: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_rblDisease"},
            FormPage.SECURITY_BACKGROUND2: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_rblArrested"},
            FormPage.SECURITY_BACKGROUND3: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_rblIllegalActivity"},
            FormPage.SECURITY_BACKGROUND4: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_rblImmigrationFraud"},
            FormPage.SECURITY_BACKGROUND5: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_rblChildCustody"},
            FormPage.RELATIVES: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_tbxFATHER_SURNAME"},
            FormPage.SPOUSE: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_tbxSpouseSurname"},
        }

        self.NAV_BUTTONS = {
            "retrieve": "#ctl00_SiteContentPlaceHolder_ApplicationRecovery1_btnBarcodeSubmit",
            "security": "#ctl00_SiteContentPlaceHolder_btnContinue",
            "continue": "#ctl00_SiteContentPlaceHolder_ApplicationRecovery1_btnContinueApp"
        }

        self.page_urls = {
            FormPage.PERSONAL1.value: "https://ceac.state.gov/GenNIV/General/complete/complete_personal.aspx?node=Personal1",
            FormPage.PERSONAL2.value: "https://ceac.state.gov/GenNIV/General/complete/complete_personalcont.aspx?node=Personal2",
            FormPage.TRAVEL.value: "https://ceac.state.gov/GenNIV/General/complete/complete_travel.aspx?node=Travel",
            FormPage.TRAVEL_COMPANIONS.value: "https://ceac.state.gov/GenNIV/General/complete/complete_travelcompanions.aspx?node=TravelCompanions",
            FormPage.PREVIOUS_TRAVEL.value: "https://ceac.state.gov/GenNIV/General/complete/complete_previousustravel.aspx?node=PreviousUSTravel",
            FormPage.ADDRESS_PHONE.value: "https://ceac.state.gov/GenNIV/General/complete/complete_contact.aspx?node=AddressPhone",
            FormPage.PPTVISA.value: "https://ceac.state.gov/GenNIV/General/complete/Passport_Visa_Info.aspx?node=PptVisa",
            FormPage.USCONTACT.value: "https://ceac.state.gov/GenNIV/General/complete/complete_uscontact.aspx?node=USContact",
            FormPage.WORK_EDUCATION1.value: "https://ceac.state.gov/GenNIV/General/complete/complete_workeducation1.aspx?node=WorkEducation1",
            FormPage.WORK_EDUCATION2.value: "https://ceac.state.gov/GenNIV/General/complete/complete_workeducation2.aspx?node=WorkEducation2",
            FormPage.WORK_EDUCATION3.value: "https://ceac.state.gov/GenNIV/General/complete/complete_workeducation3.aspx?node=WorkEducation3",
            FormPage.SECURITY_BACKGROUND1.value: "https://ceac.state.gov/GenNIV/General/complete/complete_securityandbackground1.aspx?node=SecurityandBackground1",
            FormPage.SECURITY_BACKGROUND2.value: "https://ceac.state.gov/GenNIV/General/complete/complete_securityandbackground2.aspx?node=SecurityandBackground2",
            FormPage.SECURITY_BACKGROUND3.value: "https://ceac.state.gov/GenNIV/General/complete/complete_securityandbackground3.aspx?node=SecurityandBackground3",
            FormPage.SECURITY_BACKGROUND4.value: "https://ceac.state.gov/GenNIV/General/complete/complete_securityandbackground4.aspx?node=SecurityandBackground4",
            FormPage.SECURITY_BACKGROUND5.value: "https://ceac.state.gov/GenNIV/General/complete/complete_securityandbackground5.aspx?node=SecurityandBackground5",
            FormPage.RELATIVES.value: "https://ceac.state.gov/GenNIV/General/complete/complete_family1.aspx?node=Relatives",
            FormPage.SPOUSE.value: "https://ceac.state.gov/GenNIV/General/complete/complete_family2.aspx?node=Spouse"
            
        }

    def get_page_identifier(self, page: FormPage) -> Dict[str, str]:
        return self.page_identifiers.get(page, {})

    def get_field_selector(self, page: FormPage, field_name: str) -> Optional[str]:
        page_mappings = self.form_mapping.get(page, {})
        field_id = page_mappings.get(field_name)
        
        if not field_id and '.' in field_name:
            # Try exact match first, then try parent paths
            parts = field_name.split('.')
            while parts:
                test_key = '.'.join(parts)
                if test_key in page_mappings:
                    field_id = page_mappings[test_key]
                    break
                parts.pop()
        
        return f"#{field_id}" if field_id else None

    def map_form_data(self, data: Dict[str, Any], page_type: FormPage) -> Dict[str, Any]:
        mapped_data = {}
        
        if "button_clicks" in data:
            mapped_data["button_clicks"] = data["button_clicks"]
        
        page_mappings = self.form_mapping.get(page_type, {})
        
        def flatten_dict(d: Dict[str, Any], prefix: str = '') -> Dict[str, Any]:
            items = []
            for k, v in d.items():
                new_key = f"{prefix}.{k}" if prefix else k
                if isinstance(v, dict):
                    items.extend(flatten_dict(v, new_key).items())
                else:
                    items.append((new_key, v))
            return dict(items)
        
        flattened_data = flatten_dict(data)
        
        for field_name, value in flattened_data.items():
            if field_name == "button_clicks":
                continue
            
            if field_name in page_mappings:
                mapped_field_id = page_mappings[field_name]
                mapped_data[mapped_field_id] = value
            else:
                logging.warning(f"No mapping found for field '{field_name}' on page {page_type.value}")
        
        return mapped_data