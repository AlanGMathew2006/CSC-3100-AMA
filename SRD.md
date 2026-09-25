# **<u>STUDENT PROJECT TEMPLATE (SRS)</u>** 

_<u>(INSTRUCTION FOR STUDENTS: THIS DOCUMENT SERVES AS THE FORMAL</u> 'CONTRACT' FOR YOUR TEAM PROJECT. IT MUST BE MAINTAINED IN YOUR GITHUB_ 

_<u>REPOSITORY.)</u>_ 

# **<u>CAMPUS PROVISION TRACKER</u>** 

# **SOFTWARE REQUIREMENTS SPECIFICATION** 

**INSTRUCTOR:** LARA NICHOLS-BROWN 

**TERM:** FALL 2026 

**SECTION:** 11 

# **THE ENGINEERING TEAM:** 

1. **STUDENT A:** ALAN MATHEW — SCRUM MASTER

2. **STUDENT B:** AARAV BABEL — PROJECT MANAGER

3. **STUDENT C:** MAX PLANKAR — LEAD ENGINEER 

# **PROJECT ASSETS:** 

- **GITHUB:** https://github.com/AlanGMathew2006/CSC-3100-AMA 

- **DEPLOYMENT:** [LINK TO LIVE SITE] 

# **DOCUMENT HISTORY:** 

|LAST DATE CHANGED:<br>WHO:<br>WHAT WAS CHANGED:|
|---|
|**2026-09-23**<br>**Alan Mathew, Aarav Babel, Max Plankar**<br>Replaced placeholder workout stories with coordinated Campus Provision Tracker user stories. Added first-author attribution, acceptance criteria, assumptions, and stakeholder questions.|
|**2026-09-25**<br>**Max Plankar**<br>Added two more user stories regarding recommendation nutrition and cost details and dining-location filtering. Updated the related acceptance criteria, functional requirements, and traceability entries.|
|**2026-09-25**<br>**Aarav Babel**<br>Added US-06 and US-07 covering daily dining-dollar budgeting and meal-to-target nutrition comparison. Updated the related acceptance criteria, functional requirements, and traceability entries.|
|**2026-09-25**<br>**Alan Mathew**<br>Added US-08 and US-09 covering allergen and ingredient exclusions and saving favorite meals. Updated the related acceptance criteria, functional requirements, and traceability entries.|



# **CAMPUS PROVISION TRACKER SOFTWARE REQUIREMENTS SPECIFICATION (SRS)** 

**COURSE: CSC 3100 DATE: 2026-09-23**

|**TABL**|**E OF**|**CONTENTS**|
|---|---|---|
|**1. **|**INTR**|**ODUCTION ...................................................................................... [PAGE #]**|
||**`O`**|**1.1 PROJECT PURPOSE**|
||**`O`**|**1.2 INTENDED AUDIENCE**|
||**`O`**|**1.3 PROJECT SCOPE**|
|**2. **|**USER**|**STORIES ....................................................................................... [PAGE #]**|
||**`O`**|**2.1 USER FEATURES (THE"SHALL" STATEMENTS)**|
||**`O`**|**2.2 ADMIN FEATURES**|
|**3. **|**FUNC**|**TIONAL REQUIREMENTS....................................................... [PAGE #]**|
|**4. **|**NON-**|**FUNCTIONAL REQUIREMENTS ............................................ [PAGE #]**|
||**`O`**|**4.1 DATA INTEGRITY & SECURITY**|
||**`O`**|**4.2 PERFORMANCE & USABILITY**|
|**5. **|**SYST**|**EM ARCHITECTURE ................................................................ [PAGE #]**|
||**`O`**|**5.1 REST API ENDPOINTS**|
||**`O`**|**5.2 DATABASE SCHEMA (MYSQL)**|
|**6. **|**USER**|**INTERFACE (UI) ...................................................................... [PAGE #]**|
||**`O`**|**6.1 WIREFRAMES / MOCKUPS**|
|**7. **|**DATA**|**REQUIREMENTS ..................................................................... [PAGE #]**|
||**`O`**|**7.1 LIST OF PERSISTENT DATA**|
|**8. **|**TRAC**|**EABILITY MATRIX ................................................................. [PAGE #]**|
|**9. **|**APPE**|**NDICES ....................................................................................... [PAGE #]**|



# **1.** **<u>INTRODUCTION</u>** 

- **<u>PROBLEM STATEMENT:</u>** <u>IT IS VERY DIFFICULT FOR MANY STUDENTS TO OPTIMIZE THEIR DINING DOLLARS IN A WAY THAT ALLOWS THEM TO REACH THEIR DAILY MACRONUTRIENT GOALS</u> 

- **<u>TARGET AUDIENCE:</u>** <u>FIRST AND SECOND YEAR CAL POLY STUDENTS WHO RELY ON A DINING PLAN FOR THEIR MEALS</u> 

- **<u>SCOPE:</u>** <u>WITHIN THE SCHOOL, CAL POLY</u> 

# **2.** **<u>USER STORIES</u>** 

# _<u>USER STORIES FOLLOW THE FORMAT:</u>_ **_"AS A [TYPE OF USER], I WANT TO [ACTION]_** 

# **_<u>SO THAT [VALUE/BENEFIT]."</u>_** 

These stories describe the connected student experience: a student can review their available dining dollars, provide nutritional preferences, and use those inputs to receive food recommendations.

|ID|USER STORY|FIRST AUTHOR|PRIORITY|
|---|---|---|---|
|US-01|As a Cal Poly student with a dining plan, I want to view my current dining dollar balance so that I know how much I can spend on food.|Alan Mathew|1|
|US-02|As a student with specific nutritional needs, I want to edit nutritional filters so that recommendations reflect my preferences.|Aarav Babel|2|
|US-03|As a student who wants to make informed meal choices, I want to receive food recommendations based on my nutritional filters and dining dollar balance so that I can improve my nutrition while using my dining dollars effectively.|Max Plankar|3|
|US-04|As a student comparing dining options, I want to view the nutrition and dining dollar cost of each recommended item so that I can choose a meal that fits my needs and budget.|Max Plankar|4|
|US-05|As a student choosing where to eat, I want to filter recommendations by dining location so that I can find suitable options at a convenient campus location.|Max Plankar|5|
|US-06|As a student managing a limited dining budget, I want to set a target amount of dining dollars to spend per day so that I can pace my spending throughout the quarter.|Aarav Babel|6|
|US-07|As a student trying to meet my nutrition goals, I want to see how closely a recommended meal matches my calorie and macronutrient targets so that I can compare recommendations more effectively.|Aarav Babel|7|
|US-08|As a student with dietary restrictions, I want to exclude foods containing allergens or ingredients I avoid so that recommendations are safe to eat.|Alan Mathew|8|
|US-09|As a student, I want to save favorite meals so that I can quickly find dining options I enjoyed before.|Alan Mathew|9|

## **2.1 ACCEPTANCE CRITERIA**

### **US-01: View current dining dollar balance**

- **Given** a student has access to the Campus Provision Tracker, **when** the student opens their dining balance, **then** the system displays the student's current dining dollar amount.
- **Given** the dining dollar amount is unavailable, **when** the student requests the balance, **then** the system clearly indicates that the balance could not be retrieved instead of displaying an invented amount.

### **US-02: Edit nutritional filters**

- **Given** a student is viewing their nutritional preferences, **when** the student changes a filter, **then** the system saves and displays the updated filter value.
- **Given** a student has saved nutritional filters, **when** recommendations are requested, **then** the system uses those filters as recommendation inputs.

### **US-03: Receive food recommendations**

- **Given** a student has a dining dollar balance and nutritional filters, **when** the student requests recommendations, **then** the system presents food recommendations that use both inputs.
- **Given** the student changes a nutritional filter or dining dollar balance, **when** recommendations are requested again, **then** the system reflects the updated input values.

### **US-04: View recommendation nutrition and cost**

- **Given** a student receives a food recommendation, **when** the student views the recommendation details, **then** the system displays the item's available nutritional information and dining dollar cost.
- **Given** nutrition or cost information is unavailable for a recommended item, **when** the student views its details, **then** the system clearly identifies the unavailable information instead of displaying an invented value.

### **US-05: Filter recommendations by dining location**

- **Given** recommendations are available for multiple dining locations, **when** the student selects a dining location, **then** the system displays recommendations available at that location.
- **Given** the student clears the dining location filter, **when** recommendations are displayed, **then** the system shows recommendations from all available dining locations.

### **US-06: Set a daily dining dollar target**

- **Given** a student is managing their dining budget, **when** the student enters a daily dining dollar target, **then** the system saves and displays that target for use in future recommendations.
- **Given** a student has an active daily dining dollar target, **when** recommendations are generated, **then** the system uses that target to help pace the student's spending throughout the quarter.

### **US-07: Compare meal alignment to nutrition targets**

- **Given** a student has calorie and macronutrient targets, **when** the student views a recommended meal, **then** the system indicates how closely the meal matches those targets.
- **Given** multiple recommended meals are available, **when** the student compares them, **then** the system helps highlight which recommendation is closest to the student's nutrition goals.

### **US-08: Exclude allergens and avoided ingredients**

- **Given** a student has specified allergens or ingredients to avoid, **when** recommendations are generated, **then** the system excludes meals containing those allergens or ingredients.
- **Given** ingredient information is unavailable for a potential recommendation, **when** dietary restrictions are active, **then** the system clearly identifies the missing information instead of presenting the meal as safe to eat.

### **US-09: Save favorite meals**

- **Given** a student is viewing a meal, **when** the student saves it as a favorite, **then** the system adds the meal to the student's saved favorites.
- **Given** a student has saved favorite meals, **when** the student opens their favorites, **then** the system displays those meals so the student can quickly find them again.

## **2.2 ASSUMPTIONS**

- Students using the tool have a Cal Poly dining plan and a current dining dollar balance available to the system.
- Nutritional filters are selected by the student and may be changed as their needs change.
- Recommendations are informational and support meal planning; they do not replace professional nutritional advice.

## **2.3 STAKEHOLDER QUESTIONS**

- What types of nutritional filters should the first version support?
- How should the system calculate the number of meals per day for a student?
- Which dining locations and menu items should be included in recommendations?



# **3.** **<u>FUNCTIONAL REQUIREMENTS</u>**

_THE SYSTEM SHALL..._

|ID|REQUIREMENT|PRIORITY|
|---|---|---|
|FR-01|The system shall display the student's current dining dollar balance.|1|
|FR-02|The system shall allow the student to create and edit nutritional filters.|2|
|FR-03|The system shall generate food recommendations using the student's nutritional filters and dining dollar balance.|3|
|FR-04|The system shall display available nutritional information and dining dollar cost for each recommended item.|4|
|FR-05|The system shall allow the student to filter recommendations by dining location.|5|
|FR-06|The system shall allow the student to set a daily dining dollar target for pacing spending throughout the quarter.|6|
|FR-07|The system shall indicate how closely each recommended meal matches the student's calorie and macronutrient targets.|7|
|FR-08|The system shall allow the student to exclude recommended foods containing specified allergens or avoided ingredients.|8|
|FR-09|The system shall allow the student to save and view favorite meals.|9|



# **<u>4. NON-FUNCTIONAL REQUIREMENTS</u>** 

- **<u>INTEGRITY:</u>** <u>HANDLING ERRORS AND BAD DATA</u> 

- **<u>SECURITY:</u>** <u>IMPLEMENT BCRYPT FOR PASSWORD HASHING AND ENVIRONMENT VARIABLES FOR DB CREDENTIALS.</u> 

- **<u>USABILITY</u>** <u>:</u> 

# **<u>5. SYSTEM ARCHITECTURE</u>** 

- **<u>REST ENDPOINTS:</u>** <u>(LIST METHOD | URL | DESCRIPTION)</u> 

- **<u>LIST YOUR PLANNED ENDPOINTS BASED ON YOUR REST SLIDE:</u>** 

   - **`O`** **<u>GET /API/RESOURCES — FETCHES COLLECTION.</u>** 

   - **`O`** **<u>POST /API/RESOURCES — CREATES A NEW RESOURCE.</u>** 

- **<u>UML:</u>** <u>(ATTACH A DIAGRAM)</u> 

# **5.** **<u>USER INTERFACE (UI)</u>** 

# **A.** **<u>5.1 WIREFRAMES / MOCKUPS</u>** 

# **6.** **<u>DATA REQUIREMENTS</u>** 

# **7.** **<u>TRACEABILITY MATRIX</u>** 

|ID|REQUIREMENT|LINE OF CODE|
|---|---|---|
|US-01|The system shall display the student's current dining dollar balance.|TBD|
|US-02|The system shall allow the student to create and edit nutritional filters.|TBD|
|US-03|The system shall generate food recommendations using the student's nutritional filters and dining dollar balance.|TBD|
|US-04|The system shall display available nutritional information and dining dollar cost for each recommended item.|TBD|
|US-05|The system shall allow the student to filter recommendations by dining location.|TBD|
|US-06|The system shall allow the student to set a daily dining dollar target to pace spending throughout the quarter.|TBD|
|US-07|The system shall show how closely each recommended meal matches the student's calorie and macronutrient targets.|TBD|
|US-08|The system shall allow the student to exclude recommended foods containing specified allergens or avoided ingredients.|TBD|
|US-09|The system shall allow the student to save and view favorite meals.|TBD|



# **8.** **<u>AI USAGE & DISCLOSURE (MANDATORY)</u>** 

- **<u>MODEL(S) USED:</u>** <u>[E.G., CLAUDE 3.5, GPT-4O]</u> 

- **<u>PROMPTS USED DURING CODING:</u>** 
