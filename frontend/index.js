import {
    initializeBlock,
    useBase,
    useRecords,
    useGlobalConfig,
    useSettingsButton,
    Box,
    Heading,
    ViewPickerSynced,
    RecordCard,
    TablePickerSynced,
    FormField,
    FieldPickerSynced,
    Button,
    Text,
    ViewportConstraint,
    colors
} from '@airtable/blocks/ui';
import React, {useState} from 'react';
import { FieldType } from '@airtable/blocks/models';
import PersonNameLink from './person_name_link';

const GlobalConfigKeys = {
    VIEW_ID: 'viewId',
    PEOPLE_TABLE_ID: 'peopleTableId',
    PEOPLE_APPOINTMENTS_LINK_FIELD_ID: 'peopleAppointmentsLinkFieldId',
    PEOPLE_NAME_FIELD_ID: 'peopleNameFieldId',
    APPOINTMENTS_TABLE_ID: 'appointmentsTableId',
    APPOINTMENTS_START_FIELD_ID: 'appointmentsStartFieldId',
    APPOINTMENTS_END_FIELD_ID: 'appointmentsEndFieldId'
};

function ScheduleConflictsBlock() {
    const VIEWPORT_MIN_WIDTH = 345;
    const VIEWPORT_MIN_HEIGHT = 200;
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const appointmentsTableId = globalConfig.get(GlobalConfigKeys.APPOINTMENTS_TABLE_ID);
    const appointmentsStartFieldId = globalConfig.get(GlobalConfigKeys.APPOINTMENTS_START_FIELD_ID);
    const appointmentsEndFieldId = globalConfig.get(GlobalConfigKeys.APPOINTMENTS_END_FIELD_ID);
    const peopleTableId = globalConfig.get(GlobalConfigKeys.PEOPLE_TABLE_ID);
    const peopleNameFieldId = globalConfig.get(GlobalConfigKeys.PEOPLE_NAME_FIELD_ID);
    const peopleAppointmentsLinkFieldId = globalConfig.get(GlobalConfigKeys.PEOPLE_APPOINTMENTS_LINK_FIELD_ID);

    const initialSetupDone = appointmentsTableId && appointmentsStartFieldId && appointmentsEndFieldId &&
                            peopleTableId && peopleNameFieldId && peopleAppointmentsLinkFieldId ? true : false;

    // Use settings menu to hide away table pickers
    const [isShowingSettings, setIsShowingSettings] = useState(!initialSetupDone);
    useSettingsButton(function() {
        initialSetupDone && setIsShowingSettings(!isShowingSettings);
    });

    const appointmentsTable = base.getTableByIdIfExists(appointmentsTableId);
    const appointmentsStartField = initialSetupDone ?
            appointmentsTable.getFieldByIdIfExists(appointmentsStartFieldId) : null;
    const appointmentsEndField = initialSetupDone ?
            appointmentsTable.getFieldByIdIfExists(appointmentsEndFieldId): null;

    const peopleTable = base.getTableByIdIfExists(peopleTableId);
    const peopleNameField = initialSetupDone ?
            peopleTable.getFieldByIdIfExists(peopleNameFieldId) : null;
    const peopleAppointmentsLinkField = initialSetupDone ?
            peopleTable.getFieldByIdIfExists(peopleAppointmentsLinkFieldId) : null;

    // The view ID is stored in globalConfig using ViewPickerSynced.
    const viewId = globalConfig.get(GlobalConfigKeys.VIEW_ID);
    const appointmentsView = initialSetupDone ? appointmentsTable.getViewByIdIfExists(viewId) : null;

    const people = useRecords(peopleTable ? peopleTable.selectRecords() : null);
    const appointments = useRecords(appointmentsView ? appointmentsView.selectRecords() : null);

    if (isShowingSettings) {
        return (
            <ViewportConstraint minSize={{width: VIEWPORT_MIN_WIDTH, height: VIEWPORT_MIN_HEIGHT}}>
                <SettingsMenu
                    globalConfig={globalConfig}
                    base={base}
                    peopleTable={peopleTable}
                    appointmentsTable={appointmentsTable}
                    initialSetupDone={initialSetupDone}
                    onDoneClick={() => setIsShowingSettings(false)}
                />
            </ViewportConstraint>
        )
    } else {
        // As we loop through person-appointment pairings, store any conflicts found in array
        const conflicts = [];

        if (appointments) {
            // Get a person's linked appointments and match them with the person
            const peopleAppointments = people ? people.map(person => {
                const personLinkedAppointments = person.getCellValue(peopleAppointmentsLinkField);
                const appointmentIds = personLinkedAppointments ? personLinkedAppointments.map(a => a.id) : [];

                const personAppointments = appointments ? appointments.filter(a => appointmentIds.includes(a.id)) : [];

                const personAppntmntsObj = {
                    person: person,
                    appointments: personAppointments
                };
                return personAppntmntsObj;
            }) : [];

            // Loop and identify conflicts
            peopleAppointments.forEach(personAppntmnts => {
                const { person, appointments } = personAppntmnts;

                // Use a Set so that if an appointment is found to conflict with multiple other
                // appointments, it still only shows in the display once
                const conflictingRecords = new Set();
                const appointmentsChecked = [];
                for (var i=0; i < appointments.length; i++) {
                    let start = new Date(appointments[i].getCellValue(appointmentsStartField));
                    let end = new Date(appointments[i].getCellValue(appointmentsEndField));
                    let appt = appointments[i];

                    // since we check each appointment against all others,
                    // we only want to do it once per appointment - we keep track here
                    appointmentsChecked.push(appt.id);

                    appointments.forEach(compareAppntmnt => {
                        // don't check against appointments that have already been checked
                        if (!appointmentsChecked.includes(compareAppntmnt.id)) {
                            let compareStart = new Date(compareAppntmnt.getCellValue(appointmentsStartField));
                            let compareEnd = new Date(compareAppntmnt.getCellValue(appointmentsEndField));

                            if (
                                // #1 : Preceeding Overlap
                                (compareStart > start && compareStart < end) ||
                                // #2 : Post-ceeding Overlap
                                (compareEnd > start && compareEnd < end) ||
                                // #3 : Contained (inclusive)
                                (compareStart <= start && compareEnd >= end)
                            ) {
                                // we found a conflict, so add both records to the Set
                                conflictingRecords.add(appt).add(compareAppntmnt);
                            }
                        }
                    });
                };

                if (conflictingRecords.size > 0) {
                    const conflict = {person: person, conflictingAppointments: [...conflictingRecords]};
                    conflicts.push(conflict);
                }
            });
        }

        // If we have conflicts, display a ConflictContainer with all person-conflict pairings
        // If we have no conflicts, display a NoConflictsHeader
        const conflictsDisplay = conflicts.length > 0 ? conflicts.map((conflict, index) => {
            return <ConflictContainer
                        key={index}
                        person={conflict.person}
                        records={conflict.conflictingAppointments}
                    />
        }) : <NoConflictsHeader viewSelected={globalConfig.get(GlobalConfigKeys.VIEW_ID)}/>;

        return (
            <ViewportConstraint minSize={{width: VIEWPORT_MIN_WIDTH, height: VIEWPORT_MIN_HEIGHT}}>
                <Box paddingX={2} marginX={1}>
                    <Text size="xsmall" textColor="light">
                        View in {appointmentsTable.name} to watch for conflicts:
                    </Text>
                    <ViewPickerSynced
                        table={appointmentsTable}
                        globalConfigKey={GlobalConfigKeys.VIEW_ID}
                        autoFocus="true"
                        maxWidth="350px"
                    />
                    {conflictsDisplay}
                </Box>
            </ViewportConstraint>
        );
    }
}

function ConflictContainer({person, records}) {
    const recordsDisplay = records.length > 0 ? records.map((record, index) => {
        return <RecordCard
                    key={index}
                    record={record}
                    margin={1}
                    marginBottom={2}
                />
    }) : null;

    return (
        <Box margin={2} padding={3} backgroundColor={colors.RED_LIGHT_2} border="thick" borderRadius={5}>
            <PersonNameLink person={person}/>
            <Box overflowX="auto" paddingRight={3}>
                {recordsDisplay}
            </Box>
        </Box>
    );
};

function NoConflictsHeader({viewSelected}) {
    if (viewSelected) {
        return (
            <Box padding={4}>
                <Heading size="large" textColor="light">
                    No scheduling conflicts found 🎉
                </Heading>
            </Box>
        );
    } else {
        return (
            <Box padding={4}>
                <Text size="large" fontWeight={200} textColor="light" fontStyle="italic">
                    No view selected...
                </Text>
            </Box>
        );
    };
};

function SettingsMenu(props) {
    const resetAppointmentFieldKeys = () => {
        props.globalConfig.setAsync(GlobalConfigKeys.APPOINTMENTS_START_FIELD_ID, '');
        props.globalConfig.setAsync(GlobalConfigKeys.APPOINTMENTS_END_FIELD_ID, '');
    };

    const resetAppointmentsTableKey = () => {
        props.globalConfig.setAsync(GlobalConfigKeys.APPOINTMENTS_TABLE_ID, '');
        props.globalConfig.setAsync(GlobalConfigKeys.VIEW_ID, '');
    };

    const resetPeopleFieldKeys = () => {
        props.globalConfig.setAsync(GlobalConfigKeys.PEOPLE_NAME_FIELD_ID, '');
        props.globalConfig.setAsync(GlobalConfigKeys.PEOPLE_APPOINTMENTS_LINK_FIELD_ID, '');
    }

    const resetTableRelatedGlobalConfigKeys = () => {
        resetAppointmentsTableKey();
        resetAppointmentFieldKeys();
        resetPeopleFieldKeys();
    }

    const getLinkedApptsTable = () => {
        const linkedApptsFieldId = props.globalConfig.get(GlobalConfigKeys.PEOPLE_APPOINTMENTS_LINK_FIELD_ID);
        const peopleTableId = props.globalConfig.get(GlobalConfigKeys.PEOPLE_TABLE_ID);
        const peopleTable = props.base.getTableByIdIfExists(peopleTableId);
        const linkedApptsField = peopleTable.getFieldByIdIfExists(linkedApptsFieldId);
        const linkedTableId = linkedApptsField.options.linkedTableId;

        props.globalConfig.setAsync(GlobalConfigKeys.APPOINTMENTS_TABLE_ID, linkedTableId);
    };

    return(
        <div>
            <Heading margin={2}>
                Schedule Conflicts Settings
            </Heading>
            <Box marginX={2}>
                <FormField label="Which table holds the People/Items being scheduled?">
                    <TablePickerSynced
                        globalConfigKey={GlobalConfigKeys.PEOPLE_TABLE_ID}
                        onChange={() => resetTableRelatedGlobalConfigKeys()}
                        size="large"
                        maxWidth="350px"
                    />
                </FormField>
                {props.peopleTable &&
                    <div>
                        <Heading size="xsmall" variant="caps">{props.peopleTable.name} Fields:</Heading>
                        <Box display="flex" flexDirection="row">
                            <FormField label="Name field:" marginRight={1}>
                                <FieldPickerSynced
                                    size="small"
                                    table={props.peopleTable}
                                    globalConfigKey={GlobalConfigKeys.PEOPLE_NAME_FIELD_ID}
                                    allowedTypes={[
                                        FieldType.SINGLE_LINE_TEXT,
                                        FieldType.FORMULA,
                                        FieldType.AUTO_NUMBER,
                                        FieldType.NUMBER,
                                        FieldType.BARCODE,
                                        FieldType.EMAIL,
                                        FieldType.PHONE_NUMBER,
                                        FieldType.URL,
                                        FieldType.MULTILINE_TEXT
                                    ]}
                                />
                            </FormField>
                            <FormField label="Events/Bookings linked field:">
                                <FieldPickerSynced
                                    size="small"
                                    table={props.peopleTable}
                                    globalConfigKey={GlobalConfigKeys.PEOPLE_APPOINTMENTS_LINK_FIELD_ID}
                                    allowedTypes={[FieldType.MULTIPLE_RECORD_LINKS]}
                                    onChange={() => getLinkedApptsTable()}
                                />
                            </FormField>
                        </Box>
                    </div>
                }
                <hr/>
                {props.appointmentsTable &&
                    <div>
                        <FormField label="The table holding your Events/Bookings is:">
                            <Text size="xlarge">
                                {props.appointmentsTable.name}
                            </Text>
                        </FormField>
                        <Heading size="xsmall" variant="caps">{props.appointmentsTable.name} Fields:</Heading>
                        <Box display="flex" flexDirection="row">
                            <FormField label="Start date/time field:" marginRight={1}>
                                <FieldPickerSynced
                                    size="small"
                                    table={props.appointmentsTable}
                                    globalConfigKey={GlobalConfigKeys.APPOINTMENTS_START_FIELD_ID}
                                    allowedTypes={[
                                        FieldType.DATE,
                                        FieldType.DATE_TIME,
                                        FieldType.MULTIPLE_LOOKUP_VALUES,
                                        FieldType.ROLLUP,
                                        FieldType.FORMULA
                                    ]}
                                />
                            </FormField>
                            <FormField label="End date/time field:">
                                <FieldPickerSynced
                                    size="small"
                                    table={props.appointmentsTable}
                                    globalConfigKey={GlobalConfigKeys.APPOINTMENTS_END_FIELD_ID}
                                    allowedTypes={[
                                        FieldType.DATE,
                                        FieldType.DATE_TIME,
                                        FieldType.MULTIPLE_LOOKUP_VALUES,
                                        FieldType.ROLLUP,
                                        FieldType.FORMULA
                                    ]}
                                />
                            </FormField>
                        </Box>
                    </div>
                }
            </Box>
            <Box display="flex" marginBottom={2}>
                <Button
                    variant="primary"
                    icon="check"
                    marginLeft={2}
                    disabled={!props.initialSetupDone}
                    onClick={props.onDoneClick}
                    alignSelf="right"
                >
                    Done
                </Button>
            </Box>
        </div>
    );
}

initializeBlock(() => <ScheduleConflictsBlock />);
