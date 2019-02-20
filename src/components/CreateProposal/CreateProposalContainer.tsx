import { IDAOState, IProposalState, ProposalOutcome, IProposalStage } from "@daostack/client";
import BN = require("bn.js");
import { Field, Formik, FormikProps } from "formik";
import * as H from "history";
import * as React from "react";
import { connect } from "react-redux";
import { Web3 } from "web3";

import * as arcActions from "actions/arcActions";
import { getArc } from "arc";
import ReputationView from "components/Account/ReputationView";
import { ActionTypes, default as PreTransactionModal } from "components/Shared/PreTransactionModal";
import Subscribe, { IObservableState } from "components/Shared/Subscribe";
import UserSearchField from "components/Shared/UserSearchField";
import Util from "lib/util";
import { IRootState } from "reducers";
import { IWeb3State } from "reducers/web3Reducer";
import * as css from "./CreateProposal.scss";

const emptyProposal: IProposalState = {
  activationTime: 0,
  beneficiary: null,
  boostedAt: 0,
  boostedVotePeriodLimit: 0,
  boostingThreshold: 0,
  createdAt: 0,
  confidenceThreshold: 0,
  dao: null,
  daoBountyConst: 0, // TODO
  description: "",
  descriptionHash: "",
  ethReward: new BN(0),
  executedAt: 0,
  executionState: 0, // TODO: when client exports should be IExecutionState.None,
  externalToken: null,
  externalTokenReward: new BN(0),
  nativeTokenReward: new BN(0),
  id: null,
  organizationId: null,
  paramsHash: "",
  periods: 1,
  periodLength: 0, // TODO
  preBoostedAt: 0,
  preBoostedVotePeriodLimit: 0,
  proposer: null,
  proposingRepReward: new BN(0),
  queuedVoteRequiredPercentage: 50, //TODO: need to rethink this whole emptyProposal thing...
  queuedVotePeriodLimit: 0, // TODO: shouldnt have to think about this here
  quietEndingPeriodBeganAt: 0,
  reputationReward: new BN(0),
  resolvedAt: 0,
  stakesFor: new BN(0),
  stakesAgainst: new BN(0),
  stage: IProposalStage.Queued,
  thresholdConst: 0, // TODO
  totalRepWhenExecuted: new BN(0),
  title: "",
  votesFor: new BN(0),
  votesAgainst: new BN(0),
  winningOutcome: ProposalOutcome.Fail,
  votingMachine: null
};

interface IState {
  preTransactionModalOpen: boolean;
  proposalDetails: IProposalState;
}

interface IStateProps {
  currentAccount: string;
  daoAvatarAddress: string;
  history: H.History;
  web3: IWeb3State;
}

const mapStateToProps = (state: IRootState, ownProps: any) => {
  return {
    currentAccount: state.web3.ethAccountAddress,
    daoAvatarAddress : ownProps.match.params.daoAvatarAddress,
    history: ownProps.history,
    web3: state.web3,
  };
};

interface IDispatchProps {
  createProposal: typeof arcActions.createProposal;
}

const mapDispatchToProps = {
  createProposal: arcActions.createProposal,
};

type IProps = IStateProps & IDispatchProps;

interface FormValues {
  beneficiary: string;
  description: string;
  ethReward: number;
  externalTokenReward: number;
  nativeTokenReward: number;
  reputationReward: number;
  title: string;

  [key: string]: any;
}

class CreateProposalContainer extends React.Component<IProps, IState> {
  private web3: any;

  constructor(props: IProps) {
    super(props);

    this.state = {
      preTransactionModalOpen: false,
      proposalDetails: emptyProposal
    };

    this.handleSubmit = this.handleSubmit.bind(this);
  }

  public async componentDidMount() {
    this.web3 = Util.getWeb3();
  }

  public handleSubmit(values: FormValues, { props, setSubmitting, setErrors }: any ) {
    const proposalValues = {...values,
      ethReward: Util.toWei(values.ethReward),
      externalTokenReward: Util.toWei(values.externalTokenReward),
      nativeTokenReward: Util.toWei(values.nativeTokenReward),
      reputationReward: Util.toWei(values.reputationReward)
    };

    this.setState({
      preTransactionModalOpen: true,
      proposalDetails: { ...emptyProposal, ...proposalValues}
    });
    setSubmitting(false);
  }

  public closePreTransactionModal() {
    this.setState({ preTransactionModalOpen: false });
  }

  public goBack(address: string) {
    const { history } = this.props;

    if (history.length > 0) {
      history.goBack();
    } else {
      history.push("/dao/" + address);
    }
  }

  public render() {
    const { createProposal, currentAccount, daoAvatarAddress } = this.props;
    const { beneficiary, description, ethReward, externalTokenReward, nativeTokenReward, reputationReward, title } = this.state.proposalDetails;
    const arc = getArc();
    return <Subscribe observable={arc.dao(daoAvatarAddress).state}>{
      (state: IObservableState<IDAOState>) => {
        if ( state.data !== null ) {
          const dao: IDAOState = state.data;

          // TODO: this is used to check uniqueness of proposalDescriptions,
          // it is disabled at this moment, but should be restored
          // const proposalDescriptions = (dao.proposals as IProposalState[])
          //   .filter((proposal) => !proposalEnded(proposal))
          //   .map((proposal) => proposal.description);
          const proposalDescriptions: string[] = [];
          const boundCreateProposal = createProposal.bind(null, dao.address, title, description, nativeTokenReward, reputationReward, ethReward, externalTokenReward, beneficiary);
          return (
            <div className={css.createProposalWrapper}>
              {this.state.preTransactionModalOpen ?
                <PreTransactionModal
                  actionType={ActionTypes.CreateProposal}
                  action={boundCreateProposal}
                  closeAction={this.closePreTransactionModal.bind(this)}
                  currentAccount={currentAccount}
                  dao={dao}
                  effectText=""
                  proposal={this.state.proposalDetails}
                /> : ""
              }

              <h2>
                <span>+ New proposal <b>| Contribution Reward</b></span>
              </h2>
              <Formik
                initialValues={{
                  beneficiary: "",
                  description: "",
                  ethReward: 0,
                  externalTokenReward: 0,
                  nativeTokenReward: 0,
                  reputationReward: 0,
                  title: ""
                } as FormValues}
                validate={(values: FormValues) => {
                  const errors: any = {};

                  const require = (name: string) => {
                    if (!(values as any)[name]) {
                      errors[name] = "Required";
                    }
                  };

                  const nonNegative = (name: string) => {
                    if ((values as any)[name] < 0) {
                      errors[name] = "Please enter a non-negative reward";
                    }
                  };

                  if (values.title.length > 120) {
                    errors.title = "Title is too long (max 120 characters)";
                  }

                  // TODO: do we want this uniqueness check still?
                  if (proposalDescriptions.indexOf(values.description) !== -1) {
                    errors.description = "Must be unique";
                  }

                  if (!this.web3.utils.isAddress(values.beneficiary)) {
                    errors.beneficiary = "Invalid address";
                  }

                  {/* TODO: dont need to check if description is a URL anymore
                  const pattern = new RegExp('(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9]\.[^\s]{2,})');
                  if (!pattern.test(values.description)) {
                    errors.description = 'Invalid URL';
                  }*/}

                  nonNegative("ethReward");
                  nonNegative("externalTokenReward");
                  nonNegative("nativeTokenReward");

                  require("description");
                  require("title");
                  require("beneficiary");

                  if (!values.ethReward && !values.reputationReward) {
                    errors.rewards = "Please select at least some reward";
                  }

                  return errors;
                }}
                onSubmit={this.handleSubmit}
                render={({
                  values,
                  errors,
                  touched,
                  handleChange,
                  handleBlur,
                  handleSubmit,
                  isSubmitting,
                  isValid,
                  setFieldTouched,
                  setFieldValue
                }: FormikProps<FormValues>) =>
                  <form onSubmit={handleSubmit} noValidate>

                    <label htmlFor="titleInput">
                      Title
                      {touched.title && errors.title && <span className={css.errorMessage}>{errors.title}</span>}
                    </label>
                    <Field
                      autoFocus
                      id="titleInput"
                      maxLength={120}
                      placeholder="Summarize your proposal"
                      name="title"
                      type="text"
                      className={touched.title && errors.title ? css.error : null}
                    />
                    <label htmlFor="descriptionInput">
                      Description
                      <img className={css.infoTooltip} src="/assets/images/Icon/Info.svg"/>
                      {touched.description && errors.description && <span className={css.errorMessage}>{errors.description}</span>}
                    </label>

                    <Field
                      component="textarea"
                      id="descriptionInput"
                      placeholder="Proposal description URL"
                      name="description"
                      className={touched.description && errors.description ? css.error : null}
                    />
                    <div className={css.addTransfer}>
                      <div className={css.rewardRow + " " + css.clearfix}>
                        <div className={css.rewardAmount}>
                          <input className={css.contributionReward} placeholder="Amount"/>
                          <div className={css.contributionType}>
                            <select className={css.contributionTypeDropdown}>
                              <option value="ETH">ETH</option>
                              <option value="ETH">GEN</option>
                              <option value="ETH">Reputation</option>
                            </select>
                          </div>
                        </div>
                        <div className={css.rewardRecipient}>
                          <div className={css.rewardArrow}>
                            <img className={css.infoTooltip} src="/assets/images/Icon/Right-arrow.svg"/>
                          </div>
                          <UserSearchField
                            daoAvatarAddress={daoAvatarAddress}
                            name="beneficiary"
                            onBlur={(touched) => { setFieldTouched("beneficiary", touched); }}
                            onChange={(newValue) => { setFieldValue("beneficiary", newValue); }}
                          />
                          <label htmlFor="beneficiary" className={css.beneficiaryLabel}>
                            {touched.beneficiary && errors.beneficiary && <span className={css.errorMessage}>{errors.beneficiary}</span>}
                          </label>
                        </div>
                      </div>

                      <div>
                        <button className={css.addReward}>
                          +
                        </button>
                      </div>

                      <div style={{display: "none"}}>
                        <Field
                          id="nativeTokenRewardInput"
                          maxLength={10}
                          placeholder="How many tokens to reward"
                          name="nativeTokenReward"
                          type="number"
                          className={touched.nativeTokenReward && errors.nativeTokenReward ? css.error : null}
                        />
                        <label htmlFor="nativeTokenRewardInput">
                          {dao.tokenSymbol} reward:
                          {touched.nativeTokenReward && errors.nativeTokenReward && <span className={css.errorMessage}>{errors.nativeTokenReward}</span>}
                        </label>
                      </div>

                      <label htmlFor="reputationRewardInput">
                        Reputation reward:
                        {touched.reputationReward && errors.reputationReward && <span className={css.errorMessage}>{errors.reputationReward}</span>}
                      </label>
                      <Field
                        id="reputationRewardInput"
                        placeholder="How much reputation to reward"
                        name="reputationReward"
                        type="number"
                        className={touched.reputationReward && errors.reputationReward ? css.error : null}
                        step={0.1}
                      />

                      {dao.externalTokenAddress
                        ? <div>
                            <label htmlFor="externalRewardInput">
                              Proposal budget ({dao.externalTokenSymbol}):
                              {touched.externalTokenReward && errors.externalTokenReward && <span className={css.errorMessage}>{errors.externalTokenReward}</span>}
                            </label>
                            <Field
                              id="externalTokenRewardInput"
                              placeholder={`How much ${dao.externalTokenSymbol} to reward`}
                              name="externalTokenReward"
                              type="number"
                              className={touched.externalTokenReward && errors.externalTokenReward ? css.error : null}
                              min={0}
                              step={0.1}
                            />
                          </div>
                        : <div>
                            <label htmlFor="ethRewardInput">
                              Proposal budget (ETH):
                              {touched.ethReward && errors.ethReward && <span className={css.errorMessage}>{errors.ethReward}</span>}
                            </label>
                            <Field
                              id="ethRewardInput"
                              placeholder="How much ETH to reward"
                              name="ethReward"
                              type="number"
                              className={touched.ethReward && errors.ethReward ? css.error : null}
                              min={0}
                              step={0.1}
                            />
                          </div>
                      }

                      {(touched.ethReward || touched.externalTokenReward) && touched.reputationReward && errors.rewards && <span className={css.errorMessage + " " + css.someReward}><br/> {errors.rewards}</span>}
                    </div>
                    <div className={css.alignCenter}>
                      <button className={css.exitProposalCreation} onClick={this.goBack.bind(this, dao.address)}>
                        Cancel
                      </button>
                      <button className={css.submitProposal} type="submit" disabled={isSubmitting}>
                        Submit proposal
                      </button>
                    </div>
                  </form>
                }
              />

            </div>
          );
        } else {
          return null;
       }
     }
    }</Subscribe>;
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(CreateProposalContainer);
