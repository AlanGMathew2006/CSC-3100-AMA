# **<u>STUDENT PROJECT TEMPLATE (SRS)</u>** 

_<u>(INSTRUCTION FOR STUDENTS: THIS DOCUMENT SERVES AS THE FORMAL</u> 'CONTRACT' FOR YOUR TEAM PROJECT. IT MUST BE MAINTAINED IN YOUR GITHUB_ 

_<u>REPOSITORY.)</u>_ 

# **<u>[INSERT PROJECT NAME HERE]</u>** 

# **SOFTWARE REQUIREMENTS SPECIFICATION** 

**INSTRUCTOR:** LARA NICHOLS-BROWN 

**TERM:** [E.G., SPRING 2026] 

**SECTION:** [SECTION NUMBER] 

# **THE ENGINEERING TEAM:** 

1. **STUDENT A:** [NAME] — [ROLE, E.G., APP ARCHITECT] 

2. **STUDENT B:** [NAME] — [ROLE, E.G., API DEVELOPER] 

3. **STUDENT C:** [NAME] — [ROLE, E.G., SCRUM MASTER] 

# **PROJECT ASSETS:** 

- **GITHUB:** [LINK] 

- **DEPLOYMENT:** [LINK TO LIVE SITE] 

# **DOCUMENT HISTORY:** 

|LAST DATE CHANGED:<br>WHO:<br>WHAT WAS CHANGED:|
|---|



# **[PROJECT TITLE] SOFTWARE REQUIREMENTS SPECIFICATION (SRS)** 

**COURSE: [COURSE NAME/NUMBER] DATE: [SUBMISSION DATE]** 

|**TABL**|**E OF**|**CONTENTS**|
|---|---|---|
|**1. **|**INTR**|**ODUCTION ...................................................................................... [PAGE #]**|
||**`O`**|**1.1 PROJECT PURPOSE**|
||**`O`**|**1.2 INTENDED AUDIENCE**|
||**`O`**|**1.3 PROJECT SCOPE**|
|**2. **|**USER**|**STOREIES ..................................................................................... [PAGE #]**|
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

- **<u>PROBLEM STATEMENT:</u>** <u>WHAT SPECIFIC PROBLEM ARE YOU SOLVING?</u> 

- **<u>TARGET AUDIENCE:</u>** <u>WHO ARE THE STAKEHOLDERS?</u> 

- **<u>SCOPE:</u>** <u>WHAT IS THE SCOPE OF THIS PROJECT?</u> 

# **2.** **<u>USER STORIES</u>** 

# _<u>USER STORIES FOLLOW THE FORMAT:</u>_ **_"AS A [TYPE OF USER], I WANT TO [ACTION]_** 

# **_<u>SO THAT [VALUE/BENEFIT]."</u>_** 

- **<u>US-01:</u>** <u>AUTHENTICATION</u> 

- **<u>US-02:</u>** <u>STORE WORKOUT_LOG.</u> 

- **<u>US-03:</u>** <u>SEARCH HISTORY</u> 

|ID|REQUIREMENT|PRIORITY|
|---|---|---|
|US-01|As a user, I want to<br>authenticate via<br>username and<br>password.|2|
|US-02|As a user, I want to<br>store workout<br>information|1|
|US-03|As a user, I want to<br>search workout history|3|
|US-04|As a user, I want to add<br>new workout types.|4|



# **3.** **<u>FUNCTIONAL REQUIREMENTS</u>** 

_THE SYSTEM SHALL..._ 

|ID|REQUIREMENT|PRIORITY|
|---|---|---|
|FR-01|The system will|2|
||authenticate users via||
||username and||
||password.||
|FR-02|Allow users to store|1|



||workout information||
|---|---|---|
|US-03|Allow users to search|3|
||their workout history||
|US-04|Allow users to add new|4|
||workout types.||



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
|US-01|The system will|152|
||authenticate users via<br>username and<br>password.||
|US-02|Allow users to store|256|
||workout information||
|US-03|Allow users to search|46|



||their workout history||
|---|---|---|
|US-04|Allow users to add new|45|
||workout types.||



# **8.** **<u>AI USAGE & DISCLOSURE (MANDATORY)</u>** 

- **<u>MODEL(S) USED:</u>** <u>[E.G., CLAUDE 3.5, GPT-4O]</u> 

- **<u>PROMPTS USED DURING CODING:</u>** 

