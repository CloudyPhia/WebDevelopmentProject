Please edit this template and commit to the master branch for your user stories submission.   
Make sure to follow the *Role, Goal, Benefit* framework for the user stories and the *Given/When/Then* framework for the Definitions of Done! You can also refer to the examples DoDs in [C3 spec](https://sites.google.com/view/ubc-cpsc310-21w2-intro-to-se/project/checkpoint-3).

## User Story 1
As a student, I want to be able to customize a search for a course so that I can find information specific to me.

#### Definitions of Done(s)
Scenario 1: Correctly Customized Query\
Given: The student is on the home page.\
When: The student clicks the search button and correctly fills out a query form using the drop down menus and input boxes, and clicks “Search”.\
Then: The query form clears itself and the website displays the relevant information in an organized table.

Scenario 2: Incorrectly Customized Query\
Given: The student is on the home page.\
When:  The student clicks the search button and incorrectly fills out a query form using the drop down menus and input boxes, and clicks “Search”.\
Then: The query form clears itself and the website remains on the search page and displays an error in red asking the user to try again.

## User Story 2
As an administrator, I want to add a dataset so that students and faculty can access the information.


#### Definitions of Done(s)
Scenario 1: Valid Input Dataset\
Given: The administrator is on the home page.\
When: The administrator clicks the add dataset button, chooses a correctly formatted zip file with courses to upload, and clicks “Submit”.\
Then: The administrator remains on the home page and a list below the add dataset button is updated to include the dataset the administrator added and the dataset is correctly stored in memory and on disk.

Scenario 2: Invalid Input Dataset\
Given: The administrator is on the home page.\
When: The administrator clicks the add dataset button, chooses a file that is not a zip file or in the correct format, and clicks “Submit”.\
Then: The administrator remains on the home page and the page displays a message in red informing the administrator that there was an error in adding the dataset.


## Others
You may provide any additional user stories + DoDs in this section for general TA feedback.
Note: These will not be graded.
