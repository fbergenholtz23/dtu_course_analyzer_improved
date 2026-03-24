

class Config:
    course_semesters = [
      'E10', 'F11', 'E11', 'F12', 'E12', 'F13', 'E13', 'F14', 'E14', 'F15',     
      'E15', 'F16', 'E16', 'F17', 'E17', 'F18', 'E18', 'F19', 'E19', 'F20',     
      'E20', 'F21', 'E21', 'F22', 'E22', 'F23', 'E23', 'F24', 'E24', 'F25',     
  'E25', 'F26'                                                                  
  ]                                                                             
    course_years = '2025-2026'
    data_null_value = None  #type: ignore
    data_decimal_precision = 2
    data_percental_precision = 1

    website_current_year = "2025-2026"
    website_last_updated = "27/02/2026"

    # feature flags for scraping
    feature_flag_scrape_archive = True
    feature_flag_scrape_evals = True
    feature_flag_scrape_grades = True
    feature_flag_scrape_info = True
