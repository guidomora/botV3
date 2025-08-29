### History

#### 29/08/25
- types added 
- TODO:
 - continue checking if ai fails 
 - add all tests for google module
 - divide delete flow in use-cases maybe

#### 26/08/25
- Bug fixed: Because of the addition of new reservations, the row index was not correct, so the availability was failing at getting data and updating it. Now gets the right index for each date and time
- delete flow works, need to test it more

#### 24/08/25
- deleteReservation flow is wrking, but need to add integration with update availability sheet

#### 22/08/25
- started with the deleteReservation flow, need to test if it works and add integration with the delete row

#### 18/08/25
- added all tests for google repository (almost)
- added deleteRow() method at google repository and service

#### 17/08/25
- removed the `createReservation` method from dates controller. Now is temporal
- refactored the createReservation() to use use-cases
- added the type to the `addData` at createReservation() google repository
- added tests at google service
- new feature to check availability from the controller, ai service integration
- added validations for the reservation creation flow and the addition at the second sheet

#### 14/08/25
- Create reservation flow DONE
 

#### 13/08/25
- Create reservation flow at 95% done

#### 10/08/25
- New types and index files at /lib
- Bug fixed at the reservations and availability methods
- Started working at the addition of a reservation for the second sheet
- flow at 85% done

#### 09/08/25
- Ai response type added
- New api key for new pc
- integration of the ai service with the reservations service works
- validation if a date does not exist

#### 08/08/25
- Prompt for OpenAI added and working, returns the date in a json format
- New folder `prompts` added

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