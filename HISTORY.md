### History

#### 08/08/25
- Prompt for OpenAI added and working, returns the date in a json format
- New folder `prompts` added
- TODO:
 - Create a Type for the response from OpenAI
 - Add some validations for the creation of the reservation (date, times, availability)
 - add all tests for google module
 - remove the `createReservation` method from dates controller. Now is temporal

#### 05/08/25
- index at constants added
- some types added
- This flow will start at reservations module
- Continue with the creation of the CreateReservation feature
- OpenAI integration started --> `ai` module


#### 31/07/25
- CreateReservation in progress: currently we are only getting the index of the date
- Tests added at google service module


#### 30/07/25
- Check date working
- Tests added at dates module


#### 28/07/25
- Started working for a feature to check for a date `getDate`

### 27/07/25
- Create multiple days working
- Tests added

### 26/07/25
- Next day working
- little refactor on the project structure

---
#### 17/07/25
- Flow to create a datetime working for both sheets
- Google sheets integration working

---
#### 16/07/25
- Flow to create a datetime added 80%, still need to check the google sheets integration
- Constants added

---
#### 15/07/25
- Dates module
- Aplications layer introduced --> `use-cases`
- Started thinking about the `createDay` feature

---
#### 14/07/25
- Creation of the project
- Google Sheets integration added in a module
- module for reservations added