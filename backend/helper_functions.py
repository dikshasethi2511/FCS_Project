from all_imports import *


def convert_dict_to_json(dictionary: dict):
    json_result = {}
    for key, value in dictionary.items():
        if key == '_id' or key == "password" or key == "identityProof":
            continue
        json_result[key] = value

    return json_result


def custom_json_encoder(item):
    if isinstance(item, ObjectId):
        return str(item)
    raise TypeError(f"{item} is not JSON serializable")


def getAmenities(inQuery, amenities):
    if not amenities:
        return False
    if not inQuery:
        return True
    inQueryList = [word.strip().lower() for word in inQuery.split(',')]
    amenitiesList = [word.strip().lower() for word in amenities.split(',')]
    for amenity in inQueryList:
        if amenity not in amenitiesList:
            return False
    if (len(inQueryList) > len(amenitiesList)):
        return False
    return True


def parse_date(date_string):
    date_formats = ["%d-%m-%Y", "%d/%m/%Y"]
    for date_format in date_formats:
        try:
            return datetime.strptime(date_string, date_format)
        except ValueError:
            pass
    return None


def is_property_available_for_dates(property, start_date, end_date):

    from_date = property["start_date"]
    to_date = property["end_date"]
    property_start_date = parse_date("01/01/2000")
    property_end_date = parse_date("01/01/2999")
    input_start_date = None
    input_end_date = None

    if from_date:
        property_start_date = parse_date(from_date)
    if end_date:
        property_end_date = parse_date(to_date)
    if start_date:
        input_start_date = parse_date(start_date)
    if end_date:
        input_end_date = parse_date(end_date)

    if not input_start_date and not input_end_date:
        return True

    if input_start_date and not input_end_date:
        if property_start_date <= input_start_date and property_end_date > input_start_date:
            return True

    if not input_start_date and input_end_date:
        if property_start_date < input_end_date and property_end_date >= input_end_date:
            return True

    if input_start_date and input_end_date:
        if property_start_date <= input_start_date and property_end_date > input_start_date and property_start_date < input_end_date and property_end_date >= input_end_date:
            return True
    return False


def is_valid_number(s):
    # Check if the string contains only numeric digits
    if s.isdigit():
        # Convert the string to an integer
        num = int(s)
        
        # Check if the integer is between 0 and 3000 (inclusive)
        if 0 < num <= 3000:
            return True
        else:
            return False
    else:
        return False
    
def is_valid_date(date_string):
    try:
        # Attempt to parse the string as a date
        datetime_object = datetime.strptime(date_string, '%d/%m/%Y')
        return True
    except ValueError:
        # If an exception is raised, the string is not a valid date
        return False
    
def is_end_date_greater(start_date, end_date):
    # Convert start_date and end_date to datetime objects
    start_date_object = datetime.strptime(start_date, '%d/%m/%Y')
    end_date_object = datetime.strptime(end_date, '%d/%m/%Y')
    
    # Check if end_date is greater than start_date and has a difference of at least one month
    return end_date_object > start_date_object and (end_date_object - start_date_object) >= timedelta(days=30)
