### History

#### 07/01/26
- Re worked on update reservation flow: Date works - Time works - Date and time - quantity - all cases works
- name update at aiService for open AI config
- TODO:
 - Test unhappy paths on ALL flows
 - AI it is not greeting the user
 - add the OFFTOPIC strategy
 - Work on some flow when we could not find a reservation, there is no availability, etc (unhappy paths)
 - Make the cache last a little longer and not clean it when the flow is done
 - add all tests for google module

#### 06/01/26
- Re worked on update reservation flow: Date works - Time works - Date and time works
- few logs added to debug the update reservation flow
- Need to work on the other fields update, as quantity and name

#### 05/01/26
- Testing update reservation flow: Date works - Time works - Date and time works
- Need to work on the other fields update, as quantity and name

#### 04/01/26
- Update reservation flow works , but need to test other cases and it is not answering the last message to the user
- date update tested

#### 02/01/26
- Working on update reservation flow, something is done, but one part is not working

#### 31/12/25
- Working on update reservation flow, little advance thanks to Codex

#### 29/12/25
- Working on update reservation flow

#### 22/12/25
- started working at update reservation flow

#### 21/12/25
- little updates

#### 20/12/25
- Factory method added at ai service


#### 19/12/25
- Availability flow at 100% working


#### 18/12/25
- Availability for a day works and supports the creation of a reservation with the consulted date
- Availability for date and time works

#### 17/12/25
- Continuing with the availability flow.Availability for a day returns the data from google sheets


#### 16/12/25
- Continuing with the availability flow. Working at getDayAvailability at google-sheets service, for now returns all the rows for the received day.


#### 8/12/25
- Continuing with the availability flow
- updated some names
- started working with some methods

#### 7/12/25
- Continuing with the availability flow
- new prompt

#### 29/11/25
- Now supports multiple messages with a timelapse. The flow works fine
- Depending on the length of the message, the timelapse will be longer or shorte

#### 28/11/25
- Started working at the message queue. It works but i have to refine the code and do more tests (whatsapp service)

#### 05/11/25
- info reservation strategy started
- cache module updated

#### 30/10/25
- types added at temporal data flow
- all the data that is going to be saved at google sheets, need to be parsed to lowercase

#### 29/10/25
- cancel flow working for multiple messages
- prompts updated

#### 28/10/25
- cancel flow working for one message with all the data
- need to fix the cancel flow for multiple messages. It is not reading the context of the conversation and the known data.

#### 25/10/25
- cache module added and working at create reservation with multiple messages

#### 24/10/25
- few adds at cache workflow

#### 21/10/25
- started working at cache module

#### 20/10/25
- started working at delete/cancel flow strategy
- started thinking about the implementation of cache for user messages

#### 19/10/25
- Strategy working
- few updates at create reservation flow

#### 18/10/25
- Strategy pattern added to control user intentions

#### 12/10/25
- reservation completed and in progress prompts works
- types added

#### 10/10/25
- moved logic from temporal data flow to dates module (there was a bug)
- temporal data flow integrated with ai service --> working


#### 07/10/25
- new method at ai service to start receiving data from whatsapp

#### 06/10/25
- temporal data flow works

#### 05/10/25
- transition from temporal data flow to reservation data flow structure

#### 28/09/25
- refactor the code from temporal data flow



#### 27/09/25
- temporal data flow works
- create diagram for the temporal data flow at Miro


#### 11/09/25
- controller created at google-sheets module to test the temporal data flow
- .module updated at google-sheets module
- Flow?: 
    - check if already we have data
    - set state depending on it
    - start adding data
    - retrieve existing data
    - update data with new data received
    - delete data, once the reservation is created at google sheets

#### 10/09/25
- started working at the temporal data flow
- helper function added at google-sheets module
- think about the implementation of a state to handle the temporal data

#### 07/09/25
- investigating twilio integration and webhook
- new google sheet added for temporal data

#### 06/09/25
- delete old rows flow works
- whatsapp module added
- integration with twilio started

#### 04/09/25
- continue working at delete old rows flow, need to test
- new method at google service added to get the index of a row only by date

#### 03/09/25
- delete old rows flow defined 
- started working at delete old rows flow
- test cases for use-cases added
- date.service tests refactored


#### 31/08/25
- use-case for delete flow added, less code at dates service
- refactor at dates service. The date.service file was getting too big, so i divide it into use-cases

#### 30/08/25
- tests added at google repository


#### 29/08/25
- types added 

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