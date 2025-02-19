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
        # Import individual page mappings
        from .page_mappings.start_page_mapping import form_mapping as start_mapping
        from .page_mappings.retrieve_page_mapping import form_mapping as retrieve_mapping
        from .page_mappings.personal_page1_mapping import form_mapping as personal1_mapping
        from .page_mappings.personal_page2_mapping import form_mapping as personal2_mapping
        from .page_mappings.travel_page_mapping import form_mapping as travel_mapping
        from .page_mappings.travel_companions_page_mapping import form_mapping as travel_companions_mapping
        from .page_mappings.previous_travel_page_mapping import form_mapping as previous_travel_mapping
        from .page_mappings.address_phone_page_mapping import form_mapping as address_phone_mapping
        from .page_mappings.pptvisa_page_mapping import form_mapping as pptvisa_mapping
        from .page_mappings.us_contact_page_mapping import form_mapping as us_contact_mapping
        from .page_mappings.relatives_page_mapping import form_mapping as relatives_mapping
        from .page_mappings.workeducation1_page_mapping import form_mapping as workeducation1_mapping
        from .page_mappings.workeducation2_page_mapping import form_mapping as workeducation2_mapping
        from .page_mappings.workeducation3_page_mapping import form_mapping as workeducation3_mapping
        from .page_mappings.security_background1_page_mapping import form_mapping as security_background1_mapping
        from .page_mappings.security_background2_page_mapping import form_mapping as security_background2_mapping
        from .page_mappings.security_background3_page_mapping import form_mapping as security_background3_mapping
        from .page_mappings.security_background4_page_mapping import form_mapping as security_background4_mapping
        from .page_mappings.security_background5_page_mapping import form_mapping as security_background5_mapping
        from .page_mappings.spouse_page_mapping import form_mapping as spouse_mapping
        from .page_mappings.security_page_mapping import form_mapping as security_mapping

        self.form_mapping = {
            FormPage.START.value: start_mapping,
            FormPage.RETRIEVE.value: retrieve_mapping,
            FormPage.SECURITY.value: security_mapping,
            FormPage.PERSONAL1.value: personal1_mapping,
            FormPage.PERSONAL2.value: personal2_mapping,
            FormPage.TRAVEL.value: travel_mapping,
            FormPage.TRAVEL_COMPANIONS.value: travel_companions_mapping,
            FormPage.PREVIOUS_TRAVEL.value: previous_travel_mapping,
            FormPage.ADDRESS_PHONE.value: address_phone_mapping,
            FormPage.PPTVISA.value: pptvisa_mapping,
            FormPage.USCONTACT.value: us_contact_mapping,
            FormPage.RELATIVES.value: relatives_mapping,
            FormPage.WORK_EDUCATION1.value: workeducation1_mapping,
            FormPage.WORK_EDUCATION2.value: workeducation2_mapping,
            FormPage.WORK_EDUCATION3.value: workeducation3_mapping,
            FormPage.SECURITY_BACKGROUND1.value: security_background1_mapping,
            FormPage.SECURITY_BACKGROUND2.value: security_background2_mapping,
            FormPage.SECURITY_BACKGROUND3.value: security_background3_mapping,
            FormPage.SECURITY_BACKGROUND4.value: security_background4_mapping,
            FormPage.SECURITY_BACKGROUND5.value: security_background5_mapping,
            FormPage.SPOUSE.value: spouse_mapping
        }

        self.page_identifiers = {
            FormPage.START.value: {"verify_element": "#ctl00_ddlLanguage"},
            FormPage.RETRIEVE.value: {"verify_element": "#ctl00_SiteContentPlaceHolder_ApplicationRecovery1_tbxApplicationID"},
            FormPage.SECURITY.value: {"verify_element": "#ctl00_SiteContentPlaceHolder_chkbxPrivacyAct"},
            FormPage.PERSONAL1.value: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_SURNAME"},
            FormPage.PERSONAL2.value: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_ddlAPP_NATL"},
            FormPage.TRAVEL.value: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_ddlPurposeOfTrip"},
            FormPage.TRAVEL_COMPANIONS.value: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_rblOtherPersonsTravelingWithYou"},
            FormPage.PREVIOUS_TRAVEL.value: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_rblPREV_US_TRAVEL_IND"},
            FormPage.ADDRESS_PHONE.value: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_LN1"},
            FormPage.PPTVISA.value: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_NUM"},
            FormPage.USCONTACT.value: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_SURNAME"},
            FormPage.WORK_EDUCATION1.value: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_ddlPresentOccupation"},
            FormPage.WORK_EDUCATION2.value: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_rblPreviouslyEmployed"},
            FormPage.WORK_EDUCATION3.value: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_dtlLANGUAGES_ctl00_tbxLANGUAGE_NAME"},
            FormPage.SECURITY_BACKGROUND1.value: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_rblDisease"},
            FormPage.SECURITY_BACKGROUND2.value: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_rblArrested"},
            FormPage.SECURITY_BACKGROUND3.value: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_rblIllegalActivity"},
            FormPage.SECURITY_BACKGROUND4.value: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_rblImmigrationFraud"},
            FormPage.SECURITY_BACKGROUND5.value: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_rblChildCustody"},
            FormPage.RELATIVES.value: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_tbxFATHER_SURNAME"},
            FormPage.SPOUSE.value: {"verify_element": "#ctl00_SiteContentPlaceHolder_FormView1_tbxSpouseSurname"},
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
        return self.page_identifiers.get(page.value, {})

    def get_field_selector(self, page: FormPage, field_name: str) -> Optional[str]:
        page_mappings = self.form_mapping.get(page.value, {})
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
        
        page_mappings = self.form_mapping.get(page_type.value, {})
        
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